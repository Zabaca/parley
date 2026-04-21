import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["waiting", "active", "closed"] })
    .notNull()
    .default("waiting"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  closedAt: text("closed_at"),
  idleTimeout: integer("idle_timeout").notNull().default(3600),
});

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  userLabel: text("user_label", { enum: ["User A", "User B"] }).notNull(),
  connectionId: text("connection_id"),
  joinedAt: text("joined_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  senderId: text("sender_id")
    .notNull()
    .references(() => participants.id),
  rawContent: text("raw_content").notNull(),
  polishedContent: text("polished_content").notNull(),
  sentAsRaw: integer("sent_as_raw", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  sourceMessageId: text("source_message_id")
    .notNull()
    .references(() => messages.id),
  title: text("title").notNull(),
  status: text("status", { enum: ["open", "resolved", "parked"] })
    .notNull()
    .default("open"),
  surfacedAt: text("surfaced_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  resolvedAt: text("resolved_at"),
});

export const facts = sqliteTable("facts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  sourceMessageId: text("source_message_id")
    .notNull()
    .references(() => messages.id),
  content: text("content").notNull(),
  establishedAt: text("established_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const actionItems = sqliteTable("action_items", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  sourceMessageId: text("source_message_id")
    .notNull()
    .references(() => messages.id),
  content: text("content").notNull(),
  assignedTo: text("assigned_to", { enum: ["User A", "User B", "both"] }).notNull(),
  status: text("status", { enum: ["open", "completed"] })
    .notNull()
    .default("open"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Relations
export const sessionsRelations = relations(sessions, ({ many }) => ({
  participants: many(participants),
  messages: many(messages),
  topics: many(topics),
  facts: many(facts),
  actionItems: many(actionItems),
}));

export const participantsRelations = relations(participants, ({ one }) => ({
  session: one(sessions, { fields: [participants.sessionId], references: [sessions.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, { fields: [messages.sessionId], references: [sessions.id] }),
  sender: one(participants, { fields: [messages.senderId], references: [participants.id] }),
}));

export const topicsRelations = relations(topics, ({ one }) => ({
  session: one(sessions, { fields: [topics.sessionId], references: [sessions.id] }),
  sourceMessage: one(messages, { fields: [topics.sourceMessageId], references: [messages.id] }),
}));

export const factsRelations = relations(facts, ({ one }) => ({
  session: one(sessions, { fields: [facts.sessionId], references: [sessions.id] }),
  sourceMessage: one(messages, { fields: [facts.sourceMessageId], references: [messages.id] }),
}));

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
  session: one(sessions, { fields: [actionItems.sessionId], references: [sessions.id] }),
  sourceMessage: one(messages, { fields: [actionItems.sourceMessageId], references: [messages.id] }),
}));

// Inferred types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
export type Fact = typeof facts.$inferSelect;
export type NewFact = typeof facts.$inferInsert;
export type ActionItem = typeof actionItems.$inferSelect;
export type NewActionItem = typeof actionItems.$inferInsert;
