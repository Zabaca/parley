import { initContract } from "@ts-rest/core";
import {
  SessionResponseSchema,
  GetSessionQuerySchema,
  AblyTokenResponseSchema,
} from "./schemas.js";

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
    },
  },
  requestAblyToken: {
    method: "POST",
    path: "/api/ably-token",
    responses: {
      200: AblyTokenResponseSchema,
    },
    body: c.noBody(),
  },
});
