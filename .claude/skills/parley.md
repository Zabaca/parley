---
name: parley
description: AI-mediated peer-to-peer communication
user_invocable: true
---

# /parley

Start or join an AI-mediated conversation.

## Usage

- `/parley` — Create a new session. Generates a UUID token to share with the other participant.
- `/parley <uuid>` — Join an existing session using the provided token.

## What it does

1. **Create** (`/parley`): Calls the platform API to create a session, displays the token, launches the local Bun app, and opens the chat UI in the browser. Waits for the other participant to join.

2. **Join** (`/parley <uuid>`): Validates the session token against the platform API, launches the local Bun app on a separate port, and opens the chat UI. The session goes live once both participants are connected.

## Implementation

TODO: Implement session creation/joining logic, Bun app launch, and browser opening.
