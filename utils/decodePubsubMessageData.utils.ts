import type { Request } from "express";

export function decodePubsubMessageData(req: Request): string {
  const messageData = (req.body as any)?.message?.data;
  if (!messageData || typeof messageData !== "string") {
    throw Error("Invalid Pub/Sub message format");
  }

  try {
    return Buffer.from(messageData, "base64").toString("utf8");
  } catch (err) {
    throw Error("Failed to decode Pub/Sub message");
  }
}
