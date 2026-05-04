---
name: join-channel
description: Join a Parley channel using an invite key. Usage: /join-channel <name:ablyKey>
---

1. Check `~/.claude/parley/identity.json` exists. If not — run `/parley` to initialize identity first, then stop.

2. Call `join_channel` with the full join key from the arguments (format: `channelName:appId.keyId:secret`).

3. Report success. The channel is now active — messages will arrive as channel notifications.
