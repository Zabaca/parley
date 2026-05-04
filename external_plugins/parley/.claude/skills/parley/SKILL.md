---
name: parley
description: Show Parley status — channels you're in, your identity, and available commands. Also initializes identity on first use.
---

Check if `~/.claude/parley/identity.json` exists.

If it does NOT exist:
- Tell the user Parley needs a display name to identify them in channels
- Ask: "What name would you like to use on Parley?"
- Call `set_identity` with their answer
- Tell them to restart their Claude Code session for the name to take effect

If it DOES exist:
- Show current identity (name from file)
- Call `list_memberships` if available, or read `~/.claude/parley/memberships.json` directly to show joined channels
- Show available commands:
  - `/start-channel <name>` — create and join a new channel
  - `/invite-channel <name>` — mint an invite key to share
  - `/join-channel <key>` — join a channel with an invite key
  - `/leave-channel <name>` — leave a channel
  - `/revoke-invite <name> <keyId>` — revoke an invite key
