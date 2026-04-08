export function getSessionChannel(sessionId: string): string {
  return `session:${sessionId}`;
}

export type ChannelEvent =
  | "message"
  | "mediator:topics"
  | "mediator:facts"
  | "mediator:action-items"
  | "mediator:drift"
  | "presence";
