import express from "express";
import { OAuth2Client } from "google-auth-library";
import { PORT, PUBSUB_PUSH_AUDIENCE } from "./config/env.js";
import { handleWorkerRequest } from "./service/pubsub/pubsub.handler.js";
import { getWorkerContext, WorkerContext } from "./worker/workerContext.js";

const app = express();
app.use(express.json());
app.get("/", (_req, res) => res.status(200).send("ok"));
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
export const server = app.listen(PORT, () =>
  console.log(`Worker running on ${PORT}`),
);

const authClient = new OAuth2Client();
let workerCtx: WorkerContext = getWorkerContext();

app.post("/pubsub/push", async (req, res) => {
  if (!workerCtx) {
    return res.status(503).send("Worker not ready");
  }

  const authHeader = req.header("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Missing bearer token");
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    return res.status(401).send("Missing bearer token");
  }

  if (!PUBSUB_PUSH_AUDIENCE) {
    console.error("PUBSUB_PUSH_AUDIENCE not set");
    return res.status(500).send("Server misconfigured");
  }

  try {
    await authClient.verifyIdToken({
      idToken,
      audience: PUBSUB_PUSH_AUDIENCE,
    });
  } catch (err) {
    console.error("Invalid push auth", err);
    return res.status(403).send("Forbidden");
  }

  const messageData = req.body?.message?.data;
  if (!messageData || typeof messageData !== "string") {
    console.error("Invalid Pub/Sub message format");
    return res.status(204).send();
  }

  let decoded = "";
  try {
    decoded = Buffer.from(messageData, "base64").toString("utf8");
  } catch (err) {
    console.error("Failed to decode Pub/Sub message", err);
    return res.status(204).send();
  }

  const result = await handleWorkerRequest(workerCtx, decoded);
  if (result.status === "internal_error") {
    console.error("Pub/Sub handling error", result.error);
    return res.status(500).send();
  }

  return res.status(204).send();
});
