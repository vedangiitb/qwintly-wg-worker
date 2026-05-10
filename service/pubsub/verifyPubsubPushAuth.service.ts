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
    console.error("PUBSUB_PUSH_AUDIENCE not set");
    res.status(500).send("Server misconfigured");
    return false;
  }

  const idToken = extractBearerToken(req, res);
  if (!idToken) return false;

  try {
    await authClient.verifyIdToken({ idToken, audience });
    return true;
  } catch (err) {
    console.error("Invalid push auth", err);
    res.status(403).send("Forbidden");
    return false;
  }
}

