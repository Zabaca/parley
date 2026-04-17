import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `You are a personal Parley agent — the user's advocate in a mediated conversation with another person.

You are NOT a grammar checker. You are the user's personal diplomat. Your job is to help them communicate effectively — understanding what they really want to say, what outcome they're after, and crafting the best possible message to achieve it.

## How you work

**When the user wants to send a message:**
1. Read what they wrote and understand the intent behind it
2. Ask 1-2 brief clarifying questions if the intent, desired tone, or goal isn't clear. Examples:
   - "What outcome are you hoping for here — agreement, acknowledgment, or action?"
   - "This sounds frustrated — do you want that to come through, or keep it neutral?"
   - "Are you opening a negotiation or stating a firm position?"
3. Once you understand their intent, craft a polished version and propose it using the PROPOSAL format below
4. If their message is already crystal clear and the intent is obvious, skip the questions and propose immediately

**When the user asks for advice:**
Answer directly. You can see the full conversation history, mediator tracker, and established facts. Help them strategize — what to push back on, what to concede, what's been left unresolved.

**When the user gives you feedback on a proposal:**
Revise based on their feedback and propose again.

## PROPOSAL format

When you're ready to propose a message for the shared record, end your response with exactly this format:

<proposal>The exact message text to send</proposal>

Everything before the <proposal> tag is your explanation/commentary shown only in the private agent thread. The content inside <proposal> is what would be sent to the other person.

## Tone

Be concise and natural. No corporate speak, no filler. You're a sharp colleague helping them communicate, not a customer service bot. Match the stakes of the conversation — casual for casual, precise for high-stakes.

## Important

- Never send anything without the user's approval — always propose first
- If the user says "just send it" or "send as-is", propose their exact words verbatim
- Start with "/raw " to bypass you entirely — don't interfere with raw messages
- You advocate for YOUR user. You want them to communicate well and get the best outcome.`;

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  /** 'message' = conversational reply, 'proposal' = includes a proposed message to send */
  type: "message" | "proposal";
  /** The agent's full response text (shown in agent thread) */
  text: string;
  /** The proposed message to send (only present when type='proposal') */
  proposedMessage?: string;
}

export async function chat(params: {
  agentThread: AgentMessage[];
  mainThread: any[];
  mediatorState: any;
  userLabel: string;
}): Promise<ChatResponse> {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Build context block
  let context = "";

  if (params.mainThread.length > 0) {
    const history = params.mainThread
      .slice(-15)
      .map((m: any) => `${m.senderLabel}: ${m.polishedContent}`)
      .join("\n");
    context += `## Shared conversation record\n${history}\n\n`;
  } else {
    context += "## Shared conversation record\n(No messages yet — this will be the first message)\n\n";
  }

  if (params.mediatorState?.topics?.length > 0) {
    const topics = params.mediatorState.topics
      .map((t: any) => `- ${t.title} (${t.status})`)
      .join("\n");
    context += `## Active topics\n${topics}\n\n`;
  }

  if (params.mediatorState?.facts?.length > 0) {
    const facts = params.mediatorState.facts
      .map((f: any) => `- ${f.content}`)
      .join("\n");
    context += `## Established facts\n${facts}\n\n`;
  }

  if (params.mediatorState?.actionItems?.length > 0) {
    const items = params.mediatorState.actionItems
      .map((a: any) => `- [${a.status}] ${a.content} (${a.assignedTo})`)
      .join("\n");
    context += `## Action items\n${items}\n\n`;
  }

  // Add context as first user message
  if (context) {
    messages.push({
      role: "user",
      content: `[CONTEXT — You are advocating for ${params.userLabel}]\n\n${context}(Now respond to the conversation below in the private agent thread.)`,
    });
    messages.push({
      role: "assistant",
      content: `Understood — I'm ${params.userLabel}'s advocate. I have the conversation context. Go ahead.`,
    });
  }

  // Add the agent thread conversation history
  for (const msg of params.agentThread) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Try models in order of preference
  const models = [
    "anthropic/claude-sonnet-4",
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.3-70b-instruct",
  ];

  for (const model of models) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: 600,
        temperature: 0.4,
      });
      const result = completion.choices[0]?.message?.content?.trim();
      if (!result) continue;

      return parseResponse(result);
    } catch (err: any) {
      console.warn(`Model ${model} failed: ${err.message}`);
      continue;
    }
  }

  // All models failed
  return { type: "message", text: "I'm having trouble connecting right now. You can use /raw to send your message directly." };
}

function parseResponse(text: string): ChatResponse {
  const proposalMatch = text.match(/<proposal>([\s\S]*?)<\/proposal>/);
  if (proposalMatch) {
    const proposedMessage = proposalMatch[1].trim();
    // Text before the proposal tag is the agent's commentary
    const commentary = text.slice(0, proposalMatch.index).trim();
    return {
      type: "proposal",
      text: commentary || "Here's my proposed version:",
      proposedMessage,
    };
  }

  return { type: "message", text };
}
