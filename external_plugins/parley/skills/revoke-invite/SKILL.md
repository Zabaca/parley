---
name: revoke-invite
description: Revoke a Parley invite key, disconnecting anyone using it. Usage: /revoke-invite <channel> <keyId>
---

1. Parse arguments: first = channel name, second = keyId (format: `appId.keyId`).

2. If keyId not provided, read `~/.claude/parley/memberships.json`, find the channel, and list its invites so the user can pick one.

3. Call `revoke_invite` with `name` and `key_id`.

4. Confirm revoked. Anyone using that key loses access immediately.
