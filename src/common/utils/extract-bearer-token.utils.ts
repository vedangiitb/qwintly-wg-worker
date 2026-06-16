import type { Request, Response } from "express";

export function extractBearerToken(req: Request, res: Response): string | null {
  const authHeader = (req.header ? req.header("authorization") : (req.headers.authorization)) ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).send("Missing bearer token");
    return null;
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    res.status(401).send("Missing bearer token");
    return null;
  }

  return idToken;
}
