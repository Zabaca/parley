# Known Bugs

## BUG-001: Messages not delivered to other user after agent proposal is accepted

**Status:** Open
**Date reported:** 2026-04-17
**Branch:** `ibanzajoe/setup-and-initialization`

### Symptoms

- User A types a message in the agent thread (left column)
- The personal agent responds conversationally, asks about intent, and proposes a polished message
- User A clicks "Send Polished" or "Send Raw"
- The message appears in User A's main thread (center column)
- **User B never receives the message** -- it does not appear in User B's main thread or agent thread

This previously worked. The regression appeared during the same session where the following changes were made:

1. Identity persistence fix (localStorage-based rejoin to prevent User A being reassigned as User B on page refresh)
2. Inngest/mediator model switch from `google/gemini-2.0-flash-exp:free` (removed from OpenRouter) to `google/gemini-2.5-flash-lite`
3. Inngest CLI added as a local dev dependency

### Message flow (where to look)

The send path is:

1. **Client** (`apps/local/public/index.html` ~line 530): `sendToMainThread()` POSTs to `/api/messages`
2. **Bun proxy** (`apps/local/src/index.ts` line 50): proxies `/api/*` to the platform at `localhost:3000`
3. **Platform API** (`apps/platform/src/app/api/messages/route.ts`): inserts into DB, then publishes to Ably channel `session:{sessionId}` with event name `message`
4. **Ably** delivers the event to all subscribers on that channel
5. **Client** (`apps/local/public/index.html` line 368): `state.channel.subscribe('message', ...)` receives the event, but **filters out messages where `msg.data.senderId === state.participantId`** (line 369)

### Likely causes to investigate

1. **Ably token auth may be broken** -- each client gets an Ably token via `/api/ably-token`. If the token doesn't grant publish/subscribe on the correct channel, messages won't flow. Check that the Ably token request includes the right channel capability for `session:{sessionId}`.

2. **Both clients may have the same participantId** -- the identity persistence fix saves `participantId` to localStorage. If both browser windows somehow ended up with the same participantId, the sender filter on line 369 (`msg.data.senderId === state.participantId`) would cause every message to be filtered out on the receiver side too (since receiver thinks the message is from itself).

3. **Ably REST publish vs Realtime subscribe mismatch** -- the platform publishes via `Ably.Rest` (server-side, line 8 of messages/route.ts) and clients subscribe via `Ably.Realtime`. This should work, but if the channel names don't match exactly (e.g., encoding differences in the session UUID), the subscription would miss the publish.

4. **Proxy response handling** -- `sendToMainThread()` adds the message to `state.mainThread` on success (line 543-544), so the sender sees it locally. But if the platform's Ably publish fails silently (e.g., bad API key, channel error), the message is in the DB and shown locally but never broadcast.

### How to reproduce

1. Run `pnpm dev` (starts platform, local server, and Inngest)
2. Open `http://localhost:3001` -- create a session (copies token)
3. Open a second browser window to `http://localhost:3001` -- join with the token
4. In User A's window, type a message in the agent thread
5. Follow the agent's conversational flow until it proposes a message
6. Click "Send Polished"
7. Observe: message appears in User A's center column but NOT in User B's

### Debugging steps

- Check browser console in both windows for Ably connection errors or subscription issues
- Check the Inngest dashboard at `http://localhost:8288` for function execution logs
- Verify in the platform server logs that the Ably publish call succeeds (no error after line 41 in messages/route.ts)
- Compare `state.participantId` in both browser windows' JS consoles -- they must be different
- Check `localStorage` in both windows: `JSON.parse(localStorage.getItem('parley_identity_' + sessionId))` -- confirm different participantIds

### Related context

- The Ably token endpoint is at `apps/platform/src/app/api/ably-token/route.ts`
- The identity persistence logic is in `index.html` functions `saveIdentity()` and `loadIdentity()`
- The mediator right-column issue (not updating) was a separate bug caused by the dead OpenRouter model -- that was fixed by switching to `google/gemini-2.5-flash-lite`

---

## BUG-002: Mediator tracker (right column) may not update

**Status:** Partially fixed
**Date reported:** 2026-04-17

### What was fixed

- Inngest CLI was not running -- added to the `dev` script so it starts alongside the platform and local servers
- The mediator's AI model (`google/gemini-2.0-flash-exp:free`) was removed from OpenRouter -- switched to `google/gemini-2.5-flash-lite`

### What may still be broken

Since BUG-001 prevents messages from reaching User B, the mediator's ability to process messages and update the tracker hasn't been fully verified end-to-end. Once BUG-001 is fixed, re-test:

1. Send several messages between User A and User B
2. Check `http://localhost:8288` (Inngest dashboard) for successful function runs
3. Verify the right column populates with topics, facts, and action items within a few seconds
