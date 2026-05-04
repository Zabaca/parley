---
name: start-channel
description: Create a new Parley channel and join it as creator. Usage: /start-channel <name>
---

1. Check `~/.claude/parley/identity.json` exists. If not — run `/parley` skill to initialize identity first, then stop.

2. Call `start_channel` with the channel name from the arguments.

3. Report the result. Tell the user they can now `/invite-channel <name>` to get a join key for others.
