import type { OAuth2Client } from "google-auth-library";
import type { Request, Response } from "express";
import { extractBearerToken } from "../../utils/extractBearerToken.utils.js";

export async function verifyPubsubPushAuth(
  authClient: OAuth2Client,
  req: Request,
  res: Response,
  audience: string | undefined,
): Promise<boolean> {
  if (!audience) {
    throw new Error("PUBSUB_PUSH_AUDIENCE not set");
  }

  const idToken = extractBearerToken(req, res);
  if (!idToken) throw new Error("ID token not found");

  await authClient.verifyIdToken({ idToken, audience });
  return true;
}
