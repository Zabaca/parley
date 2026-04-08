import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { mediator } from "../../../inngest/functions/mediator";

const handler = serve({
  client: inngest,
  functions: [mediator],
});

export const { GET, POST, PUT } = handler;
