import { NextRequest, NextResponse } from "next/server";
import Ably from "ably";

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function POST(req: NextRequest) {
  const { sessionId, participantId } = await req.json();

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: participantId,
    capability: {
      [`session:${sessionId}`]: ["publish", "subscribe", "presence"],
    },
  });

  return NextResponse.json({ token: JSON.stringify(tokenRequest) });
}
