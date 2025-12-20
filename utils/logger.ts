import { Logging } from "@google-cloud/logging";
import { PROJECT_ID } from "../config/env.js";
import { sessionClients } from "../service/webSockets/websocket.service.js";
import { normalizeTimestamp } from "./normalizeTimeStamp.js";
import WebSocket from "ws";

const logging = new Logging({ projectId: PROJECT_ID });

// Track active jobs → executionId
export const activeJobs = new Map<
  string,
  { executionId: string; lastTimestamp: string; jobName: string }
>();

export async function pollLogs(sessionId: string) {
  const job = activeJobs.get(sessionId);
  if (!job) return;

  const TERMINAL_STATUSES = new Set(["SUCCESS", "ERROR", "FAILED"]);

  async function loop() {
    const job = activeJobs.get(sessionId);
    if (!job) return;

    const filter = `
resource.type="cloud_run_job"
resource.labels.job_name="${job.jobName}"
jsonPayload.type="STATUS"
jsonPayload.sessionId="${sessionId}"
timestamp > "${job.lastTimestamp}"
`;

    const [entries] = await logging.getEntries({
      filter,
      orderBy: "timestamp asc",
      pageSize: 50,
    });

    for (const entry of entries) {
      const ts = entry.metadata.timestamp;
      if (!ts) continue;

      const tsIso = normalizeTimestamp(ts);

      const payload = entry.data as {
        sessionId?: string;
        type?: string;
        message?: string;
      };

      if (
        payload?.type === "STATUS" &&
        payload?.sessionId === sessionId &&
        typeof payload?.message === "string"
      ) {
        broadCastLog(sessionId, payload.message);

        // advance cursor
        job.lastTimestamp = new Date(
          new Date(tsIso).getTime() + 1
        ).toISOString();

        if (TERMINAL_STATUSES.has(payload.message)) {
          activeJobs.delete(sessionId);
          return;
        }
      }
    }

    setTimeout(loop, 1000);
  }

  loop();
}

function sendLog(sessionId: string, message: string) {
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
  console.log("Broadcasting log for session:", sessionId, message);
  sendLog(sessionId, message);
}

// Broadcast a message to all connected sessions
export function broadcastToAll(message: string) {
  for (const sessionId of sessionClients.keys()) {
    sendLog(sessionId, message);
  }
}
