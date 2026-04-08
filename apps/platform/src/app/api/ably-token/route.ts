import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Generate Ably token request using server-side API key
  return NextResponse.json({ token: "placeholder" });
}
