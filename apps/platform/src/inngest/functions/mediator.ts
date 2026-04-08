import { inngest } from "../client";

export const mediator = inngest.createFunction(
  {
    id: "mediator",
    name: "Mediator Agent",
    triggers: [{ event: "parley/message.received" }],
  },
  async ({ event, step }) => {
    // TODO: Process message through mediator agent
    // - Update topic ledger
    // - Record new facts
    // - Log action items
    // - Detect drift
    // - Publish updates back to Ably channel
    return { status: "processed" };
  }
);
