import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { messages, participants } from "@parley/shared/db";
import { eq } from "drizzle-orm";
import Ably from "ably";
import { inngest } from "../../../inngest/client";

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function POST(req: NextRequest) {
  const { sessionId, participantId, rawContent, polishedContent, sentAsRaw } = await req.json();

  const id = crypto.randomUUID();
  await db.insert(messages).values({
    id,
    sessionId,
    senderId: participantId,
    rawContent,
    polishedContent,
    sentAsRaw,
  });

  // Look up sender label
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
  });

  const msg = {
    id,
    sessionId,
    senderId: participantId,
    senderLabel: participant?.userLabel ?? "Unknown",
    rawContent,
    polishedContent,
    sentAsRaw,
    createdAt: new Date().toISOString(),
  };

  // Publish to Ably channel
  const channel = ably.channels.get(`session:${sessionId}`);
  await channel.publish("message", msg);

  // Fire Inngest event for mediator processing (non-blocking)
  inngest.send({
    name: "parley/message.received",
    data: { sessionId, messageId: id },
  }).catch((err) => {
    console.warn("Inngest send failed (mediator will not process this message):", err.message);
  });

  return NextResponse.json(msg);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const rows = await db.query.messages.findMany({
    where: eq(messages.sessionId, sessionId),
    with: { sender: true },
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  return NextResponse.json(
    rows.map((m: any) => ({
      id: m.id,
      sessionId: m.sessionId,
      senderId: m.senderId,
      senderLabel: m.sender?.userLabel ?? "Unknown",
      rawContent: m.rawContent,
      polishedContent: m.polishedContent,
      sentAsRaw: m.sentAsRaw,
      createdAt: m.createdAt,
    }))
  );
}
