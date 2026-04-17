import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../db/client";
import { sessions, participants } from "@parley/shared/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

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

  if (existingParticipants.length >= 2) {
    // Rejoin case — return the second participant
    const p = existingParticipants[1];
    return NextResponse.json({
      sessionId,
      participantId: p.id,
      userLabel: p.userLabel,
    });
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
