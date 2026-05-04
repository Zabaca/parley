---
name: invite-channel
description: Mint an invite key for a Parley channel. Returns a join key to share. Usage: /invite-channel <name>
---

1. Check `~/.claude/parley/identity.json` exists. If not — run `/parley` to initialize identity first, then stop.

2. Call `invite_channel` with the channel name from the arguments.

3. Display the returned join key prominently so the user can copy and share it. Format:
   ```
   Join key: <key>
   ```
   Remind user this key grants access to anyone who uses it. To revoke: `/revoke-invite <name> <keyId>`.
