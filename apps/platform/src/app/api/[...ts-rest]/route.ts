import { createNextHandler } from "@ts-rest/serverless/next";
import { contract } from "@parley/shared/contract";

const handler = createNextHandler(contract, {
  createSession: async (_args, _ctx) => {
    // TODO: Create a new session in Turso
    return {
      status: 200 as const,
      body: { id: crypto.randomUUID(), status: "waiting" as const },
    };
  },
  getSession: async (args, _ctx) => {
    // TODO: Validate session exists in Turso
    return {
      status: 200 as const,
      body: { id: args.query.id, status: "waiting" as const },
    };
  },
  requestAblyToken: async (_args, _ctx) => {
    // TODO: Generate Ably token request using server-side API key
    return {
      status: 200 as const,
      body: { token: "placeholder" },
    };
  },
}, {
  basePath: "/api",
  handlerType: "app-router",
});

export { handler as GET, handler as POST };
