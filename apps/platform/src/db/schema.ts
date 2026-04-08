export const schema = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at TEXT,
    idle_timeout INTEGER NOT NULL DEFAULT 3600
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    user_label TEXT NOT NULL CHECK (user_label IN ('User A', 'User B')),
    connection_id TEXT,
    joined_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    sender_id TEXT NOT NULL REFERENCES participants(id),
    raw_content TEXT NOT NULL,
    polished_content TEXT NOT NULL,
    sent_as_raw INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    source_message_id TEXT NOT NULL REFERENCES messages(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'parked')),
    surfaced_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    source_message_id TEXT NOT NULL REFERENCES messages(id),
    content TEXT NOT NULL,
    established_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS action_items (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    source_message_id TEXT NOT NULL REFERENCES messages(id),
    content TEXT NOT NULL,
    assigned_to TEXT NOT NULL CHECK (assigned_to IN ('User A', 'User B', 'both')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;
