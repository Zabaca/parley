import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../db/client";
import { sessions, participants } from "@parley/shared/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, participantId: returningId } = body as { sessionId: string; participantId?: string };

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "closed") {
    return NextResponse.json({ error: "Session is closed" }, { status: 409 });
  }

  // Check existing participants
  const existingParticipants = await db.query.participants.findMany({
    where: eq(participants.sessionId, sessionId),
  });

  // Rejoin case — if the client knows its participantId, match it
  if (returningId) {
    const match = existingParticipants.find(p => p.id === returningId);
    if (match) {
      return NextResponse.json({
        sessionId,
        participantId: match.id,
        userLabel: match.userLabel,
      });
    }
  }

  if (existingParticipants.length >= 2) {
    // Both slots filled, no returning ID matched — return error
    return NextResponse.json({ error: "Session is full" }, { status: 409 });
  }

  // Create second participant
  const participantId = crypto.randomUUID();
  await db.insert(participants).values({
    id: participantId,
    sessionId,
    userLabel: "User B",
  });

  // Activate the session
  await db.update(sessions)
    .set({ status: "active" })
    .where(eq(sessions.id, sessionId));

  return NextResponse.json({
    sessionId,
    participantId,
    userLabel: "User B",
  });
}
