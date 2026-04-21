import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { mediator } from "../../../inngest/functions/mediator";

const handler = serve({
  client: inngest,
  functions: [mediator],
});

// Type assertion needed for Next.js 16 compatibility with Inngest
export const GET = handler.GET as any;
export const POST = handler.POST as any;
export const PUT = handler.PUT as any;
