# Parley

Claude Code channel messaging over Ably. Send messages between Claude Code sessions on any machine.

No web UI. No mediator. Just a Claude Code MCP channel server.

## How it works

Parley is a Claude Code channel plugin. It uses Ably pub/sub to deliver messages between sessions — on the same machine or across the internet. Sessions subscribe to named channels. Messages arrive as channel notifications in Claude's context.

## Install

### As a plugin

```bash
/plugin marketplace add zabaca/parley
/plugin install parley@parley
source .env && claude --dangerously-load-development-channels plugin:parley@parley
```

> `--dangerously-load-development-channels` is required during the channels research preview.

### Manual

```bash
cd external_plugins/parley
cp .env.example .env   # fill in credentials
bun install
source .env && claude --dangerously-load-development-channels server:parley
```

## Ably credentials

1. [ably.com](https://ably.com) — create free account and app
2. **`ABLY_API_KEY`** — root API key from app settings
3. **`ABLY_CONTROL_KEY`** — account access token from [ably.com/users/access_tokens](https://ably.com/users/access_tokens) with **Read App + Write Key** capabilities

## First use

Run `/parley` on first launch to set your display name.

## Commands

| Command | Description |
|---------|-------------|
| `/parley` | Show status, set identity on first use |
| `/start-channel <name>` | Create and join a channel |
| `/local-channel <name>` | Create/join a same-machine channel (FS-backed, no Ably) |
| `/invite-channel <name>` | Mint a join key to share |
| `/join-channel <key>` | Join with an invite key |
| `/leave-channel <name>` | Leave a channel |
| `/revoke-invite <name> <keyId>` | Revoke an invite key |
