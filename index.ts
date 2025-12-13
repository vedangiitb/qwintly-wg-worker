import "dotenv/config";

import { Logging } from "@google-cloud/logging";
import { PubSub } from "@google-cloud/pubsub";
import { JobsClient } from "@google-cloud/run";
import { Storage } from "@google-cloud/storage";
import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import { spawnLocalBuilder } from "./spawnLocalBuilder.js";

const PORT = process.env.PORT || 8080;
const JOB_NAME = process.env.CLOUD_RUN_JOB_NAME!;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT!;
const REGION = process.env.CLOUD_RUN_REGION!;
const jobResourceName = `projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}`;

// Set up clients
const pubsub = new PubSub({
  projectId: PROJECT_ID,
});

const logging = new Logging({ projectId: PROJECT_ID });
const jobsClient = new JobsClient({ projectId: PROJECT_ID });
const storage = new Storage({ projectId: PROJECT_ID });

// Track sessions → WebSocket clients
const sessionClients = new Map<string, Set<WebSocket>>();

// Track active jobs → executionId
const activeJobs = new Map<
  string,
  { executionId: string; lastTimestamp: string }
>();

// Create Express server + WebSocket server
const app = express();
const server = app.listen(PORT, () => console.log(`Worker running on ${PORT}`));

const wss = new WebSocketServer({ server });

// ------------------------------------------
// 1. UI connects via WebSocket
// ws://worker-host/ws/<sessionId>
// ------------------------------------------
wss.on("connection", (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const sessionId = url.pathname.replace("/ws/", "");

  if (!sessionId) {
    ws.close();
    return;
  }

  if (!sessionClients.has(sessionId)) {
    sessionClients.set(sessionId, new Set());
  }
  sessionClients.get(sessionId)!.add(ws);

  broadCastLog(sessionId, `UI connected for session ${sessionId}`);

  ws.on("close", () => {
    sessionClients.get(sessionId)?.delete(ws);
  });
});

// Helper: send log line to all UI clients for that session
function broadcastLog(sessionId: string, message: string) {
  const clients = sessionClients.get(sessionId);
  if (!clients) return;

  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      console.log("Broadcasting log:", message);
      ws.send(message);
    }
  }
}

// Alias available for other modules or naming preference
export function broadCastLog(sessionId: string, message: string) {
  broadcastLog(sessionId, message);
}

// Broadcast a message to all connected sessions
function broadcastToAll(message: string) {
  for (const sessionId of sessionClients.keys()) {
    broadcastLog(sessionId, message);
  }
}
// ------------------------------------------
// 2. Start Cloud Run Job when Pub/Sub message arrives
// ------------------------------------------

async function startBuilderJob(sessionId: string) {
  const jobParams = {
    SESSION_ID: sessionId,
    REQUEST_TYPE: "new",
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
  };

  const request = {
    name: jobResourceName,
    executionSuffix: sessionId,
    overrides: {
      containerOverrides: [
        {
          env: Object.entries(jobParams).map(([name, value]) => ({
            name,
            value: String(value),
          })),
        },
      ],
    },
  };

  broadCastLog(sessionId, `Starting Cloud Run Job for session ${sessionId}`);
  const [execution] = await jobsClient.runJob(request);
  const executionId = execution.name!.split("/").pop()!;

  activeJobs.set(sessionId, {
    executionId,
    lastTimestamp: "",
  });

  broadCastLog(sessionId, `Cloud Run Job started for session ${sessionId}`);

  // Start polling logs
  pollLogs(sessionId);
}

// ------------------------------------------
// 3. Poll Cloud Logging for logs of that specific Job execution
// ------------------------------------------
async function pollLogs(sessionId: string) {
  const job = activeJobs.get(sessionId);
  if (!job) return;

  const { executionId } = job;

  const filter = `
resource.type="cloud_run_job"
resource.labels.job_name="${JOB_NAME}"
resource.labels.execution_id="${executionId}"
`;

  async function loop() {
    const job = activeJobs.get(sessionId);
    if (!job) return; // job completed or removed

    const entries = await logging.getEntries({
      filter,
      orderBy: "timestamp asc",
    });

    const logs = entries[0];

    for (const entry of logs) {
      const entryTimestamp = entry.metadata.timestamp;

      // Only send new logs
      if (entryTimestamp && entryTimestamp > job.lastTimestamp) {
        const message =
          typeof entry.data === "string"
            ? entry.data
            : JSON.stringify(entry.data);
        job.lastTimestamp = entryTimestamp.toString();
        broadCastLog(sessionId, message);
      }
    }

    // Keep polling until job ends
    setTimeout(loop, 1000);
  }

  loop();
}

// ------------------------------------------
// 4. Pub/Sub listener
// ------------------------------------------
// The GCS bucket where the request payloads are stored. Allow override via env var.
const BUCKET_NAME = process.env.BUCKET_NAME || "qwintly-builder-requests";

async function startPubSubListener() {
  const subscription = pubsub.subscription(
    process.env.PUBSUB_SUBSCRIPTION || "website-generation-sub"
  );

  subscription.on("message", async (msg) => {
    try {
      const payload = JSON.parse(msg.data.toString());
      const { chatId: sessionId } = payload;

      console.log("Received job request:", payload);
      broadCastLog(
        sessionId,
        `Received job request: ${JSON.stringify(payload)}`
      );

      // Persist the payload to GCS so the Cloud Run job can fetch it from there.
      if (!sessionId) {
        throw new Error("Missing sessionId in payload");
      }

      const filePath = `requests/${sessionId}.json`;
      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(filePath);

      broadCastLog(
        sessionId,
        `Saving request payload to gs://${BUCKET_NAME}/${filePath}`
      );

      await file.save(JSON.stringify(payload), {
        contentType: "application/json",
      });

      broadCastLog(sessionId, "Saved payload to GCS successfully");

      if (process.env.LOCAL_MODE === "true") {
        broadCastLog(sessionId, "LOCAL MODE: Spawning builder job locally...");
        await spawnLocalBuilder(sessionId, broadCastLog);
      } else {
        await startBuilderJob(sessionId);
      }
      broadCastLog(sessionId, "Acking message");
      msg.ack();
      broadCastLog(sessionId, "Message acked");
    } catch (err) {
      console.error("PubSub error:", err);
      if (err instanceof Error) {
        broadCastLog(
          (JSON.parse(msg.data.toString()).chatId as string) || "",
          `PubSub error: ${err.message}`
        );
      }
      msg.nack();
    }
  });

  subscription.on("error", (err) => {
    console.error("SUBSCRIPTION ERROR:", err);
    broadcastToAll(`SUBSCRIPTION ERROR: ${err}`);
  });

  subscription.on("close", () => {
    console.log("SUBSCRIPTION CLOSED");
    broadcastToAll("SUBSCRIPTION CLOSED");
  });
}

startPubSubListener();
