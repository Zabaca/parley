---
name: local-channel
description: Create or join a same-machine Parley channel by name. No Ably required. Usage: /local-channel <name>
---

1. Check `~/.claude/parley/identity.json` exists. If not — run `/parley` skill to initialize identity first, then stop.

2. Call `local_channel` with the channel name from the arguments.

3. Report the result. Tell the user any other Claude Code session on this machine that runs `/local-channel <same name>` will join the same channel.
