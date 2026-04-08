import { resolve } from "path";

const PORT = 3001;
const publicDir = resolve(import.meta.dir, "../public");

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API routes placeholder
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ status: "not implemented" }, { status: 501 });
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
