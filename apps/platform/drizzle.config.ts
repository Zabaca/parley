import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_CONNECTION_URL;
if (!url) throw new Error("TURSO_CONNECTION_URL is required");

const isRemote = url.startsWith("libsql://") || url.startsWith("https://") || url.startsWith("wss://");

export default defineConfig(
  isRemote
    ? {
        schema: "../../packages/shared/src/db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: { url, authToken: process.env.TURSO_AUTH_TOKEN! },
      }
    : {
        schema: "../../packages/shared/src/db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: { url },
      },
);
