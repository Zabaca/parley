import { initContract } from "@ts-rest/core";
import {
  SessionResponseSchema,
  GetSessionQuerySchema,
  AblyTokenResponseSchema,
  JoinSessionBodySchema,
  JoinSessionResponseSchema,
  SendMessageBodySchema,
  MessageResponseSchema,
  GetMessagesQuerySchema,
  MediatorStateResponseSchema,
  AblyTokenRequestSchema,
} from "./schemas";
import { z } from "zod";

const c = initContract();

export const contract = c.router({
  createSession: {
    method: "POST",
    path: "/api/sessions",
    responses: {
      200: SessionResponseSchema,
    },
    body: c.noBody(),
  },
  getSession: {
    method: "GET",
    path: "/api/sessions",
    query: GetSessionQuerySchema,
    responses: {
      200: SessionResponseSchema,
      404: z.object({ error: z.string() }),
    },
  },
  joinSession: {
    method: "POST",
    path: "/api/sessions/join",
    responses: {
      200: JoinSessionResponseSchema,
      404: z.object({ error: z.string() }),
      409: z.object({ error: z.string() }),
    },
    body: JoinSessionBodySchema,
  },
  requestAblyToken: {
    method: "POST",
    path: "/api/ably-token",
    responses: {
      200: AblyTokenResponseSchema,
    },
    body: AblyTokenRequestSchema,
  },
  sendMessage: {
    method: "POST",
    path: "/api/messages",
    responses: {
      200: MessageResponseSchema,
    },
    body: SendMessageBodySchema,
  },
  getMessages: {
    method: "GET",
    path: "/api/messages",
    query: GetMessagesQuerySchema,
    responses: {
      200: z.array(MessageResponseSchema),
    },
  },
  getMediatorState: {
    method: "GET",
    path: "/api/mediator-state",
    query: z.object({ sessionId: z.string() }),
    responses: {
      200: MediatorStateResponseSchema,
    },
  },
});
