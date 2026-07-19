import type { Request } from "express";

export function decodePubsubMessageData(req: Request): string {
  const messageData = (req.body as any)?.message?.data;
  if (!messageData || typeof messageData !== "string") {
    throw new Error("Invalid Pub/Sub message format");
  }

  return Buffer.from(messageData, "base64").toString("utf8");
}
