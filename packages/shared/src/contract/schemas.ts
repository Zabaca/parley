import { z } from "zod";

export const SessionResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["waiting", "active", "closed"]),
});

export const GetSessionQuerySchema = z.object({
  id: z.string(),
});

export const AblyTokenResponseSchema = z.object({
  token: z.string(),
});

export const JoinSessionBodySchema = z.object({
  sessionId: z.string(),
});

export const JoinSessionResponseSchema = z.object({
  sessionId: z.string(),
  participantId: z.string(),
  userLabel: z.enum(["User A", "User B"]),
});

export const SendMessageBodySchema = z.object({
  sessionId: z.string(),
  participantId: z.string(),
  rawContent: z.string(),
  polishedContent: z.string(),
  sentAsRaw: z.boolean(),
});

export const MessageResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  senderId: z.string(),
  senderLabel: z.string(),
  rawContent: z.string(),
  polishedContent: z.string(),
  sentAsRaw: z.boolean(),
  createdAt: z.string(),
});

export const GetMessagesQuerySchema = z.object({
  sessionId: z.string(),
});

export const MediatorStateResponseSchema = z.object({
  topics: z.array(z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(["open", "resolved", "parked"]),
  })),
  facts: z.array(z.object({
    id: z.string(),
    content: z.string(),
  })),
  actionItems: z.array(z.object({
    id: z.string(),
    content: z.string(),
    assignedTo: z.enum(["User A", "User B", "both"]),
    status: z.enum(["open", "completed"]),
  })),
});

export const AblyTokenRequestSchema = z.object({
  sessionId: z.string(),
  participantId: z.string(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type AblyTokenResponse = z.infer<typeof AblyTokenResponseSchema>;
export type JoinSessionResponse = z.infer<typeof JoinSessionResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type MediatorStateResponse = z.infer<typeof MediatorStateResponseSchema>;
