import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import * as Ably from 'ably'
import { randomUUID } from 'crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir, hostname } from 'os'
import { join } from 'path'

const SESSION_UUID = randomUUID()

const PARLEY_DIR = join(homedir(), '.claude', 'parley')
const LOG_FILE = join(homedir(), '.claude', 'parley', 'parley.log')
function log(msg: string) {
  mkdirSync(PARLEY_DIR, { recursive: true })
  appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}`)
}
const IDENTITY_FILE = join(PARLEY_DIR, 'identity.json')
const MEMBERSHIPS_FILE = join(PARLEY_DIR, 'memberships.json')

function getIdentity(): string {
  if (existsSync(IDENTITY_FILE)) {
    try { return JSON.parse(readFileSync(IDENTITY_FILE, 'utf-8')).name } catch {}
  }
  return process.env.SESSION_ID ?? hostname().split('.')[0]
}

const ABLY_API_KEY = process.env.ABLY_API_KEY!
const ABLY_CONTROL_KEY = process.env.ABLY_CONTROL_KEY!
const APP_ID = ABLY_API_KEY.split('.')[0]

type Invite = { keyId: string; label: string; createdAt: string }
type Membership = { name: string; key: string; joinedAt: string; invites: Invite[] }

function loadMemberships(): Membership[] {
  if (!existsSync(MEMBERSHIPS_FILE)) return []
  try { return JSON.parse(readFileSync(MEMBERSHIPS_FILE, 'utf-8')) } catch { return [] }
}

function saveMemberships(m: Membership[]) {
  mkdirSync(PARLEY_DIR, { recursive: true })
  writeFileSync(MEMBERSHIPS_FILE, JSON.stringify(m, null, 2))
}

const channelClients = new Map<string, Ably.Realtime>()

const server = new Server(
  { name: 'parley', version: '0.1.0' },
  {
    capabilities: {
      experimental: { 'claude/channel': {} },
      tools: {},
    },
    instructions: `You are "${getIdentity()}" on Parley. Channels: ${loadMemberships().map(m => m.name).join(', ') || 'none'}. Tools: start_channel, invite_channel, join_channel, leave_channel, revoke_invite, send, debug.`,
  }
)

async function subscribeChannel(name: string, key: string) {
  if (channelClients.has(name)) return
  const clientId = `${getIdentity()}-${process.pid}`
  log(`[parley] subscribing to parley:${name} as clientId=${clientId}\n`)
  const client = new Ably.Realtime({ key, clientId })
  channelClients.set(name, client)
  client.connection.on('connected', () => {
    log(`[parley] connected to parley:${name}\n`)
  })
  client.channels.get(`parley:${name}`).subscribe('message', async (ablyMsg) => {
    const data = ablyMsg.data as { id: string; from: string; text: string; channel: string; sessionId: string }
    log(`[parley] received message on parley:${name} from=${data.from} text=${data.text}\n`)
    if (data.sessionId === SESSION_UUID) return
    try {
      await server.notification({
        method: 'notifications/claude/channel',
        params: { content: data.text, meta: { from: data.from, channel: name, id: data.id } },
      })
      log(`[parley] notification sent ok\n`)
    } catch (e) {
      log(`[parley] notification ERROR: ${e}\n`)
    }
  })
}

function unsubscribeChannel(name: string) {
  const client = channelClients.get(name)
  if (!client) return
  client.channels.get(`parley:${name}`).unsubscribe()
  client.close()
  channelClients.delete(name)
}

async function controlCreateKey(channelName: string, label: string): Promise<{ keyId: string; fullKey: string }> {
  const res = await fetch(`https://control.ably.net/v1/apps/${APP_ID}/keys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ABLY_CONTROL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: label,
      capability: { [`parley:${channelName}`]: ['publish', 'subscribe'] },
    }),
  })
  if (!res.ok) throw new Error(`Control API error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { id: string; key: string }
  return { keyId: data.id, fullKey: data.key }
}

async function controlRevokeKey(keyId: string) {
  const res = await fetch(`https://control.ably.net/v1/apps/${APP_ID}/keys/${keyId}/revoke`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ABLY_CONTROL_KEY}` },
  })
  if (!res.ok) throw new Error(`Revoke error ${res.status}: ${await res.text()}`)
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'set_identity',
      description: 'Set your Parley display name',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
    {
      name: 'start_channel',
      description: 'Create a new Parley channel and join it as creator',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
    {
      name: 'invite_channel',
      description: 'Mint an invite key for a channel. Returns a join key string to share.',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
    {
      name: 'join_channel',
      description: 'Join a channel using a join key (format: channelName:ablyKey)',
      inputSchema: { type: 'object', properties: { join_key: { type: 'string' } }, required: ['join_key'] },
    },
    {
      name: 'leave_channel',
      description: 'Leave a channel and remove from memberships',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
    {
      name: 'revoke_invite',
      description: 'Revoke an invite key, disconnecting anyone using it',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          key_id: { type: 'string', description: 'keyId from invite list (appId.keyId format)' },
        },
        required: ['name', 'key_id'],
      },
    },
    {
      name: 'send',
      description: 'Broadcast a message to a Parley channel',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['channel', 'text'],
      },
    },
    {
      name: 'debug',
      description: 'Show current parley state: identity, active channel subscriptions, memberships',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params
  const memberships = loadMemberships()

  if (name === 'set_identity') {
    const { name: displayName } = args as { name: string }
    mkdirSync(PARLEY_DIR, { recursive: true })
    writeFileSync(IDENTITY_FILE, JSON.stringify({ name: displayName }, null, 2))
    return { content: [{ type: 'text', text: `Identity set to "${displayName}".` }] }
  }

  if (name === 'debug') {
    const channels = [...channelClients.entries()].map(([ch, client]) => ({
      channel: ch,
      connectionState: client.connection.state,
      channelState: client.channels.get(`parley:${ch}`).state,
      clientId: client.auth.clientId,
    }))
    return { content: [{ type: 'text', text: JSON.stringify({ identity: getIdentity(), activeSubscriptions: channels, memberships }, null, 2) }] }
  }

  if (name === 'start_channel') {
    const { name: channelName } = args as { name: string }
    if (memberships.find(m => m.name === channelName))
      return { content: [{ type: 'text', text: `Already in "${channelName}".` }] }
    const label = `parley-${channelName}-creator`
    const { keyId, fullKey } = await controlCreateKey(channelName, label)
    memberships.push({ name: channelName, key: fullKey, joinedAt: new Date().toISOString(), invites: [{ keyId, label, createdAt: new Date().toISOString() }] })
    saveMemberships(memberships)
    await subscribeChannel(channelName, fullKey)
    return { content: [{ type: 'text', text: `Created and joined "${channelName}".` }] }
  }

  if (name === 'invite_channel') {
    const { name: channelName } = args as { name: string }
    const membership = memberships.find(m => m.name === channelName)
    if (!membership) return { content: [{ type: 'text', text: `Not in "${channelName}".` }] }
    const label = `parley-${channelName}-invite-${membership.invites.length + 1}`
    const { keyId, fullKey } = await controlCreateKey(channelName, label)
    membership.invites.push({ keyId, label, createdAt: new Date().toISOString() })
    saveMemberships(memberships)
    return { content: [{ type: 'text', text: `Join key: ${channelName}:${fullKey}` }] }
  }

  if (name === 'join_channel') {
    const { join_key } = args as { join_key: string }
    const colonIdx = join_key.indexOf(':')
    const channelName = join_key.slice(0, colonIdx)
    const ablyKey = join_key.slice(colonIdx + 1)
    if (memberships.find(m => m.name === channelName))
      return { content: [{ type: 'text', text: `Already in "${channelName}". Channel active.` }] }
    const keyId = ablyKey.split(':')[0]
    memberships.push({ name: channelName, key: ablyKey, joinedAt: new Date().toISOString(), invites: [{ keyId, label: 'join-key', createdAt: new Date().toISOString() }] })
    saveMemberships(memberships)
    await subscribeChannel(channelName, ablyKey)
    return { content: [{ type: 'text', text: `Joined "${channelName}".` }] }
  }

  if (name === 'leave_channel') {
    const { name: channelName } = args as { name: string }
    unsubscribeChannel(channelName)
    saveMemberships(memberships.filter(m => m.name !== channelName))
    return { content: [{ type: 'text', text: `Left "${channelName}".` }] }
  }

  if (name === 'revoke_invite') {
    const { name: channelName, key_id } = args as { name: string; key_id: string }
    const membership = memberships.find(m => m.name === channelName)
    if (!membership) return { content: [{ type: 'text', text: `Not in "${channelName}".` }] }
    await controlRevokeKey(key_id)
    membership.invites = membership.invites.filter(i => i.keyId !== key_id)
    saveMemberships(memberships)
    return { content: [{ type: 'text', text: `Revoked ${key_id} from "${channelName}".` }] }
  }

  if (name === 'send') {
    const { channel, text } = args as { channel: string; text: string }
    const client = channelClients.get(channel)
    if (!client) return { content: [{ type: 'text', text: `Not in "${channel}". Join first.` }] }
    log(`[parley] publishing to parley:${channel} from=${getIdentity()}\n`)
    await client.channels.get(`parley:${channel}`).publish('message', {
      id: randomUUID(), from: getIdentity(), text, channel, sessionId: SESSION_UUID,
    })
    return { content: [{ type: 'text', text: `Sent to "${channel}".` }] }
  }

  throw new Error(`Unknown tool: ${name}`)
})

await server.connect(new StdioServerTransport())

for (const m of loadMemberships()) {
  await subscribeChannel(m.name, m.key)
}
