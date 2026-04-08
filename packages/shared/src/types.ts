export type SessionStatus = "waiting" | "active" | "closed";

export interface Session {
  id: string;
  status: SessionStatus;
  created_at: string;
  closed_at: string | null;
  idle_timeout: number;
}

export interface Participant {
  id: string;
  session_id: string;
  user_label: "User A" | "User B";
  connection_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  sender_id: string;
  raw_content: string;
  polished_content: string;
  sent_as_raw: boolean;
  created_at: string;
}

export type TopicStatus = "open" | "resolved" | "parked";

export interface Topic {
  id: string;
  session_id: string;
  source_message_id: string;
  title: string;
  status: TopicStatus;
  surfaced_at: string;
  resolved_at: string | null;
}

export interface Fact {
  id: string;
  session_id: string;
  source_message_id: string;
  content: string;
  established_at: string;
}

export type ActionItemStatus = "open" | "completed";

export interface ActionItem {
  id: string;
  session_id: string;
  source_message_id: string;
  content: string;
  assigned_to: "User A" | "User B" | "both";
  status: ActionItemStatus;
  created_at: string;
}
