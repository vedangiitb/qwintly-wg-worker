import type { Request } from "express";

export function decodePubsubMessageData(req: Request): string | null {
  const messageData = (req.body as any)?.message?.data;
  if (!messageData || typeof messageData !== "string") {
    console.error("Invalid Pub/Sub message format");
    return null;
  }

  try {
    return Buffer.from(messageData, "base64").toString("utf8");
  } catch (err) {
    console.error("Failed to decode Pub/Sub message", err);
    return null;
  }
}

