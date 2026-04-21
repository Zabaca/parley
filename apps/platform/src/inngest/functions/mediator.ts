import { inngest } from "../client";
import { db } from "../../db/client";
import { messages, topics, facts, actionItems, participants } from "@parley/shared/db";
import { eq } from "drizzle-orm";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";

const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
import { z } from "zod";
import Ably from "ably";

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

const MediatorOutputSchema = z.object({
  newTopics: z.array(z.object({
    title: z.string(),
    status: z.enum(["open", "resolved", "parked"]),
  })).describe("New topics introduced in this message"),
  topicUpdates: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    newStatus: z.enum(["open", "resolved", "parked"]),
  })).describe("Existing topics whose status changed"),
  newFacts: z.array(z.object({
    content: z.string(),
  })).describe("New facts established or agreed upon"),
  newActionItems: z.array(z.object({
    content: z.string(),
    assignedTo: z.enum(["User A", "User B", "both"]),
  })).describe("New action items or commitments made"),
  driftDetected: z.boolean().describe("Whether the conversation has drifted from active topics"),
  driftNote: z.string().optional().describe("Brief note about drift if detected"),
});

export const mediator = inngest.createFunction(
  {
    id: "mediator",
    name: "Mediator Agent",
    triggers: [{ event: "parley/message.received" }],
  },
  async ({ event, step }) => {
    const { sessionId, messageId } = event.data;

    // Step 1: Load conversation context
    const context = await step.run("load-context", async () => {
      const [allMessages, existingTopics, existingFacts, existingActions] = await Promise.all([
        db.query.messages.findMany({
          where: eq(messages.sessionId, sessionId),
          with: { sender: true },
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        }),
        db.query.topics.findMany({
          where: eq(topics.sessionId, sessionId),
        }),
        db.query.facts.findMany({
          where: eq(facts.sessionId, sessionId),
        }),
        db.query.actionItems.findMany({
          where: eq(actionItems.sessionId, sessionId),
        }),
      ]);

      return {
        messages: allMessages.map((m: any) => ({
          sender: m.sender?.userLabel ?? "Unknown",
          content: m.polishedContent,
        })),
        topics: existingTopics.map(t => ({ id: t.id, title: t.title, status: t.status })),
        facts: existingFacts.map(f => f.content),
        actionItems: existingActions.map(a => ({
          content: a.content,
          assignedTo: a.assignedTo,
          status: a.status,
        })),
      };
    });

    // Step 2: Run mediator AI
    const analysis = await step.run("analyze-message", async () => {
      const conversationText = context.messages
        .map((m: any) => `${m.sender}: ${m.content}`)
        .join("\n");

      const trackerState = [
        context.topics.length > 0 ? `Current topics (use "id" to reference an existing topic in topicUpdates):\n${context.topics.map((t: any) => `- id=${t.id} title="${t.title}" status=${t.status}`).join("\n")}` : "",
        context.facts.length > 0 ? `Established facts:\n${context.facts.map((f: string) => `- ${f}`).join("\n")}` : "",
        context.actionItems.length > 0 ? `Action items:\n${context.actionItems.map((a: any) => `- ${a.content} (${a.assignedTo}, ${a.status})`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");

      let object;
      try {
        const result = await generateObject({
          model: openrouter("moonshotai/kimi-k2.5"),
          schema: MediatorOutputSchema,
          system: `You are a neutral mediator tracking a conversation between two parties. You do NOT advocate for either side. Your job is to:
1. Identify new topics raised in the conversation
2. Track when existing topics are resolved or parked
3. Record facts that both parties agree on or state
4. Log action items and commitments
5. Detect if the conversation is drifting from active topics

Be precise and conservative — only extract what is clearly stated or implied. Don't invent topics or facts that aren't present.

You MUST return a JSON object with EXACTLY these top-level keys (camelCase, no substitutions):
- "newTopics": array of { "title": string, "status": "open"|"resolved"|"parked" }
- "topicUpdates": array of { "id": string (optional, the existing topic's id — include this when updating an existing topic), "title": string, "newStatus": "open"|"resolved"|"parked" }
- "newFacts": array of { "content": string }
- "newActionItems": array of { "content": string, "assignedTo": "User A"|"User B"|"both" }
- "driftDetected": boolean
- "driftNote": string (optional)

Do NOT use snake_case. Do NOT rename fields. Do NOT add extra fields. Empty arrays are fine if nothing applies.`,
          prompt: `Conversation so far:\n${conversationText}\n\n${trackerState ? `Current tracker state:\n${trackerState}\n\n` : ""}Analyze the latest message and update the tracker.`,
        });
        object = result.object;
      } catch (err: any) {
        console.error("[mediator] generateObject failed");
        console.error("[mediator] raw text from model:", err.text ?? err.cause?.value ?? "(no raw text on error)");
        console.error("[mediator] validation issues:", err.cause?.message ?? err.message);
        throw err;
      }

      return object;
    });

    // Step 3: Persist to DB
    await step.run("persist-updates", async () => {
      // Add new topics
      for (const topic of analysis.newTopics) {
        await db.insert(topics).values({
          id: crypto.randomUUID(),
          sessionId,
          sourceMessageId: messageId,
          title: topic.title,
          status: topic.status,
        });
      }

      // Update existing topic statuses
      if (analysis.topicUpdates.length > 0) {
        const allTopics = await db.query.topics.findMany({
          where: eq(topics.sessionId, sessionId),
        });
        for (const update of analysis.topicUpdates) {
          let match = update.id ? allTopics.find(t => t.id === update.id) : undefined;
          if (!match) {
            match = allTopics.find(t => t.title.toLowerCase() === update.title.toLowerCase());
          }
          if (match) {
            await db.update(topics)
              .set({
                status: update.newStatus,
                resolvedAt: update.newStatus === "resolved" ? new Date().toISOString() : null,
              })
              .where(eq(topics.id, match.id));
          }
        }
      }

      // Add new facts
      for (const fact of analysis.newFacts) {
        await db.insert(facts).values({
          id: crypto.randomUUID(),
          sessionId,
          sourceMessageId: messageId,
          content: fact.content,
        });
      }

      // Add new action items
      for (const item of analysis.newActionItems) {
        await db.insert(actionItems).values({
          id: crypto.randomUUID(),
          sessionId,
          sourceMessageId: messageId,
          content: item.content,
          assignedTo: item.assignedTo,
        });
      }
    });

    // Step 4: Publish updates to Ably
    await step.run("publish-updates", async () => {
      const channel = ably.channels.get(`session:${sessionId}`);

      // Fetch updated state
      const [topicRows, factRows, actionRows] = await Promise.all([
        db.query.topics.findMany({ where: eq(topics.sessionId, sessionId) }),
        db.query.facts.findMany({ where: eq(facts.sessionId, sessionId) }),
        db.query.actionItems.findMany({ where: eq(actionItems.sessionId, sessionId) }),
      ]);

      await channel.publish("mediator:update", {
        topics: topicRows.map(t => ({ id: t.id, title: t.title, status: t.status })),
        facts: factRows.map(f => ({ id: f.id, content: f.content })),
        actionItems: actionRows.map(a => ({
          id: a.id,
          content: a.content,
          assignedTo: a.assignedTo,
          status: a.status,
        })),
      });

      // Mark message as processed
      await channel.publish("mediator:processed", { messageId });

      // Publish drift warning if detected
      if (analysis.driftDetected && analysis.driftNote) {
        await channel.publish("mediator:drift", { note: analysis.driftNote });
      }
    });

    return { status: "processed", messageId };
  }
);
