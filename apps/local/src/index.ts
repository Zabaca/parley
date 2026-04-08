import { resolve } from "path";
import { api } from "./api/client.js";

const PORT = 3001;
const publicDir = resolve(import.meta.dir, "../public");

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Proxy API routes to platform via typed ts-rest client
    if (url.pathname === "/api/sessions" && req.method === "POST") {
      const result = await api.createSession();
      return Response.json(result.body, { status: result.status });
    }
    if (url.pathname === "/api/sessions" && req.method === "GET") {
      const id = url.searchParams.get("id") ?? "";
      const result = await api.getSession({ query: { id } });
      return Response.json(result.body, { status: result.status });
    }
    if (url.pathname === "/api/ably-token" && req.method === "POST") {
      const result = await api.requestAblyToken();
      return Response.json(result.body, { status: result.status });
    }
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    // Serve static files from public/
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(resolve(publicDir, `.${filePath}`));

    if (await file.exists()) {
      return new Response(file);
    }

    // Fallback to index.html for SPA routing
    return new Response(Bun.file(resolve(publicDir, "index.html")));
  },
});

console.log(`Parley local running at http://localhost:${server.port}`);
