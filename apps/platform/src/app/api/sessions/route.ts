import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { sessions, participants } from "@parley/shared/db";
import { eq } from "drizzle-orm";

export async function POST() {
  const id = crypto.randomUUID();
  await db.insert(sessions).values({ id, status: "waiting" });

  // Create first participant slot
  const participantId = crypto.randomUUID();
  await db.insert(participants).values({
    id: participantId,
    sessionId: id,
    userLabel: "User A",
  });

  return NextResponse.json({ id, status: "waiting", participantId, userLabel: "User A" });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, id),
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ id: session.id, status: session.status });
}
