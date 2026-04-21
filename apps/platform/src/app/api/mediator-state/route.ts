import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db/client";
import { topics, facts, actionItems } from "@parley/shared/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const [topicRows, factRows, actionRows] = await Promise.all([
    db.query.topics.findMany({ where: eq(topics.sessionId, sessionId) }),
    db.query.facts.findMany({ where: eq(facts.sessionId, sessionId) }),
    db.query.actionItems.findMany({ where: eq(actionItems.sessionId, sessionId) }),
  ]);

  return NextResponse.json({
    topics: topicRows.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
    })),
    facts: factRows.map((f) => ({
      id: f.id,
      content: f.content,
    })),
    actionItems: actionRows.map((a) => ({
      id: a.id,
      content: a.content,
      assignedTo: a.assignedTo,
      status: a.status,
    })),
  });
}
