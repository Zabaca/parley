# parley

AI-mediated peer-to-peer communication for Claude Code. Each user's agent acts as a personal diplomat — clarifying intent before sending, summarizing and contextualizing on receive. The result is communication where both sides are heard clearly, understood fully, and protected from miscommunication.

## Concept

Parley uses three AI agents per conversation — a personal agent for each user and a neutral mediator.

### Personal agents

Each user has their own agent that advocates on their behalf.

**Sending:** Your agent works with you before anything leaves. It asks clarifying questions to understand your goal and intent, then rewrites the message — fixing grammar, removing emotion and bias, improving clarity and tone. You see the final version before it's sent. You can override and send raw at any time.

**Receiving:** Your agent processes incoming messages — summarizing, contextualizing, and presenting them in a way that's easy to act on.

Each personal agent works in its user's best interest — better presenting, proposing, and negotiating on their behalf.

### Mediator

A neutral third agent owns the shared state of the conversation. It is impartial — it doesn't advocate for either side. It tracks:

- **Topics and resolution status** — every point raised is logged. Open items are surfaced before a conversation ends. Drift is flagged.
- **Established facts** — as things are agreed upon or stated, they're recorded in a shared ledger. Either side can reference or request clarification on prior facts, keeping both parties honest and consistent.

The mediator runs as a background process — neither user manages it directly. It handles the bookkeeping so the humans can focus on the conversation.

### The result

A full message history is maintained, and senders can review both their raw input and the polished version that was transmitted. Less back-and-forth, fewer misunderstandings, nothing left unresolved, better outcomes.

## Architecture

### Local (per user)

- **`/parley` skill** — Claude Code skill as the entry point. Creates a session and returns a token, or joins an existing session with a token.
- **Bun webapp** — lightweight local server per user. Serves the chat UI in the browser and hosts the personal agent. Personal agents run via Claude Code Agent SDK, using the user's Claude subscription — no additional API cost.

### Hosted (mediator service)

- **Ably** — managed realtime messaging. Clients connect directly to Ably, one channel per session. No custom WebSocket server needed.
- **Inngest** — serverless orchestration. Ably webhooks fire Inngest events on each message. Inngest runs the mediator agent, handles retries and failure recovery.
- **Mediator agent** — runs in serverless functions via Vercel AI SDK, backed by GPT-4.1 mini. Handles topic tracking, fact ledger, drift detection, and resolution status. Publishes back to the Ably channel via REST API.
- **Turso (libSQL)** — persists conversations, topic ledger, fact base, and session state.

### Message flow

```
User A types raw message
  → Personal Agent A (local, Agent SDK) clarifies intent, rewrites
    → User A approves or overrides
      → Published to Ably channel (session:{token})
        → Ably webhook → Inngest → Mediator agent (serverless, GPT-4.1 mini)
          → Mediator updates topic ledger, fact base, flags drift
            → Message forwarded on Ably channel
              → Personal Agent B (local, Agent SDK) summarizes, contextualizes
                → User B sees processed message
```

### Key decisions

- **Clients publish directly to Ably** — no relay server. Ably handles WebSocket connections, presence, message persistence, and delivery.
- **Mediator is serverless** — no long-running server. Ably webhooks trigger Inngest functions on each message.
- **Agent SDK for personal agents, Vercel AI SDK for mediator** — personal agents leverage the user's Claude subscription. The mediator uses GPT-4.1 mini via API for cost efficiency.
- **Token-only sessions** — no user accounts. A short-lived token pairs two users into a session.
- **Conversations are persisted** — Turso/libSQL for the mediator's authoritative state. Ably channel history for message durability.
- **Mediator is async, not blocking** — messages flow between users immediately. The mediator processes in the background and catches up. The UI indicates which messages the mediator has processed so agents and users are aware of mediator coverage.
- **One Ably channel per session** — all message types (main thread, mediator updates, presence) share a single channel.
- **Monorepo** — local Bun app and Vercel backend live in the same repository.

### Local development

Two Claude Code sessions, two browsers. Run `/parley` in one session and `/parley <uuid>` in the other. Each launches its own Bun app on a different local port, opening a separate browser tab.

## Design Decisions

### ~~Data model~~

Persisted in Turso/libSQL. Agent thread conversations are local only — not stored on the server.

**sessions**
- `id` — UUID, primary key
- `status` — waiting | active | closed
- `created_at`
- `closed_at`
- `idle_timeout`

**participants**
- `id`
- `session_id` → sessions
- `user_label` — "User A" / "User B"
- `connection_id` — Ably connection identifier
- `joined_at`

**messages**
- `id`
- `session_id` → sessions
- `sender_id` → participants
- `raw_content` — what the user typed
- `polished_content` — what the personal agent produced
- `sent_as_raw` — boolean, true if user overrode the agent
- `created_at`

**topics**
- `id`
- `session_id` → sessions
- `source_message_id` → messages
- `title`
- `status` — open | resolved | parked
- `surfaced_at`
- `resolved_at`

**facts**
- `id`
- `session_id` → sessions
- `source_message_id` → messages
- `content` — the established fact
- `established_at`

**action_items**
- `id`
- `session_id` → sessions
- `source_message_id` → messages
- `content`
- `assigned_to` — User A / User B / both
- `status` — open | completed
- `created_at`

### ~~Mediator prompting~~

Same approach as the personal agent — a lightweight prompt describing role, data, and tools.

**Role:** Neutral mediator. Track topics, record facts, log action items, detect conversational drift, flag unresolved items before closure. Do not advocate for either side.

**Data:** Full main thread history, its own tracker state (topics with status, established facts, action items).

**Tools:**
- Publish to the Ably channel — to surface flags and nudges to both users
- Read/write to Turso — to persist tracker state

### ~~Personal agent prompting~~

The personal agent is Claude Code with a lightweight system prompt provided by the `/parley` skill. The prompt covers:

**Role:** You are the user's advocate in a mediated conversation. Clarify their intent before sending, improve clarity and tone, summarize and contextualize incoming messages. Honor overrides when the user wants to send raw.

**Available data:** The agent is made aware of everything it can see and reference:
- **Main thread** — full history of finalized messages between both users
- **Mediator tracker** — current topics (with status), established facts, action items, unresolved flags
- **Agent thread** — private conversation history with its own user

This allows the agent to draw on the full picture — referencing established facts, flagging unresolved topics, advising strategy based on conversation history — not just reacting to the current message.

The prompt is intentionally minimal. The agent's existing capabilities handle the rest. Different conversations have different stakes — the agent reads the room rather than following a rigid checklist.

### ~~Chat UI~~

Three-column layout:

**Agent Thread (left)** — the user's primary workspace. Private conversation between the user and their personal agent. The agent asks clarifying questions before sending, presents incoming messages with context and summary, and accepts overrides ("send raw"). The user can also ask their agent for mid-conversation advice (e.g., "what should I push back on here?").

**Main Thread (center)** — the shared record. Finalized messages between the two users — what was actually "said." Shows who sent it, the polished version by default, with an expandable view of the sender's raw input. Timestamped.

**Mediator Tracker (right)** — reference sidebar managed by the mediator agent. Contains:
- **Topics** — each with a status: open, resolved, or parked
- **Facts** — established truths agreed upon during the conversation
- **Action items** — commitments either party made (e.g., "User B will send the report by Friday")
- **Unresolved flag** — prominent indicator when open items remain, especially if someone signals they want to wrap up

### ~~Session lifecycle~~

The mediator is the authority over session state — it opens sessions, closes them, and owns all transitions.

**Creating:** User A runs `/parley`. The skill calls Vercel to create a session. The mediator accepts the session and it enters a waiting state. If no one joins after an idle period, the mediator auto-closes it.

**Joining:** User B runs `/parley <uuid>`. The skill validates the session, launches the Bun app. The mediator acknowledges both participants and the session is live.

**In progress:** No explicit pause/resume. Users can leave and come back anytime. `/parley <uuid>` rejoins an existing session. Ably handles presence and message queuing during disconnects.

**Closing:** Either user or agent can signal they want to end. The mediator checks for unresolved items — open topics, uncommitted action items — and surfaces them. The mediator finalizes the closure. If both users abandon without signaling, the mediator auto-closes after an idle period.

**Post-session:** Conversations are persisted in Turso. `/parley <uuid>` on a closed session opens it read-only.

### ~~Skill implementation~~

**`/parley` (create):**
1. Skill calls Vercel API to create a session — gets back a UUID session token
2. Displays the token for the user to share
3. Launches Bun app in the background with the session token
4. Bun app opens browser, calls Vercel for an Ably token, connects to channel
5. Shows waiting screen until the other user joins

**`/parley <uuid>` (join):**
1. Skill calls Vercel API to validate the session token — errors in terminal if invalid
2. Launches Bun app in the background with the session token
3. Bun app opens browser, calls Vercel for an Ably token, connects to channel
4. Session is live

**Lifecycle:** Runs as a Claude Code background process. User can kill it via Claude Code's built-in background process management. Token is a UUID (copy-paste, not verbal).

### ~~Deployment~~
Vercel. Serverless functions for Inngest + mediator agent. Pairs naturally with Vercel AI SDK.
