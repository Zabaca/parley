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

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type AblyTokenResponse = z.infer<typeof AblyTokenResponseSchema>;
