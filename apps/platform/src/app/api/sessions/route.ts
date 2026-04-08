import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Create a new session in Turso, return UUID
  return NextResponse.json({ id: crypto.randomUUID(), status: "waiting" });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // TODO: Validate session exists in Turso
  return NextResponse.json({ id, status: "waiting" });
}
