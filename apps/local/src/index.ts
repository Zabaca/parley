import { resolve } from "path";
import { chat } from "./agent.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const PLATFORM_URL = process.env.PLATFORM_URL ?? "http://localhost:3000";
const publicDir = resolve(import.meta.dir, "../public");

async function proxyToPlatform(path: string, req: Request): Promise<Response> {
  const url = new URL(path, PLATFORM_URL);
  // Forward query params for GET requests
  const originalUrl = new URL(req.url);
  originalUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(url.toString(), init);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return Response.json(
      { error: "Platform returned non-JSON response (may be restarting)" },
      { status: 502 },
    );
  }
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Local agent chat endpoint — conversational, not proxied to platform
    if (url.pathname === "/api/agent/chat" && req.method === "POST") {
      try {
        const body = await req.json();
        const response = await chat(body);
        return Response.json(response);
      } catch (err: any) {
        console.error("Agent chat error:", err.message);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Proxy all other API routes to platform
    if (url.pathname.startsWith("/api/")) {
      try {
        return await proxyToPlatform(url.pathname, req);
      } catch (err: any) {
        console.error("Proxy error:", err.message);
        return Response.json({ error: "Platform unavailable" }, { status: 502 });
      }
    }

    // Serve static files from public/
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const resolved = resolve(publicDir, `.${filePath}`);
    if (!resolved.startsWith(publicDir)) {
      return new Response("Not found", { status: 404 });
    }
    const file = Bun.file(resolved);

    if (await file.exists()) {
      return new Response(file);
    }

    // Fallback to index.html for SPA routing
    const fallback = resolve(publicDir, "index.html");
    if (!fallback.startsWith(publicDir)) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(Bun.file(fallback));
  },
});

console.log(`Parley local running at http://localhost:${server.port}`);
