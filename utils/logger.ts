import { Logging } from "@google-cloud/logging";
import { PROJECT_ID } from "../config/env.js";
import { statusService } from "../service/statusService/status.service.js";
import { EVENT_TYPES, EventType, GenStep } from "../types/events.js";
import { normalizeTimestamp } from "./normalizeTimeStamp.js";

const logging = new Logging({ projectId: PROJECT_ID });

type ActiveJobState = { lastTimestamp: string; jobName: string };
type StatusMeta = { eventType?: EventType; step?: GenStep; source?: string };

// Track active jobs -> execution state
export const activeJobs = new Map<string, ActiveJobState>();

const TERMINAL_STATUSES = new Set(["SUCCESS", "ERROR", "FAILED"]);

const resolveStepFromJobName = (jobName: string): GenStep =>
  jobName.toLowerCase().includes("deploy") ? "DEPLOYING" : "BUILDING";

const inferEventType = (message: string): EventType => {
  const normalized = message.trim().toLowerCase();

  if (
    normalized === "failed" ||
    normalized === "error" ||
    normalized.includes("failed") ||
    normalized.includes("error")
  ) {
    return EVENT_TYPES.STEP_ERROR;
  }

  if (
    normalized === "success" ||
    normalized === "succeeded" ||
    normalized.includes("completed") ||
    normalized.includes("successful")
  ) {
    return "STEP_FINISHED";
  }

  return EVENT_TYPES.STEP_STARTED;
};

export async function broadCastLog(
  sessionId: string,
  message: string,
  meta: StatusMeta = {},
) {
  console.log(`Log for SessionId: ${sessionId}`, message, meta);
  try {
    await statusService(
      sessionId,
      meta.eventType ?? inferEventType(message),
      meta.step ?? "INITIATING",
      message,
      meta.source ?? "worker",
    );
  } catch (err) {
    console.error("Failed to emit status event", {
      sessionId,
      message,
      meta,
      error: err,
    });
  }
}

export async function broadcastToAll(message: string, meta: StatusMeta = {}) {
  const sessionIds = [...activeJobs.keys()];
  await Promise.allSettled(
    sessionIds.map((sessionId) => broadCastLog(sessionId, message, meta)),
  );
}

export async function pollLogs(sessionId: string) {
  const job = activeJobs.get(sessionId);
  if (!job) return;

  async function loop() {
    try {
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
          await broadCastLog(sessionId, payload.message, {
            step: resolveStepFromJobName(job.jobName),
            source: `cloud_run_job:${job.jobName}`,
          });

          // advance cursor
          job.lastTimestamp = new Date(
            new Date(tsIso).getTime() + 1,
          ).toISOString();

          if (TERMINAL_STATUSES.has(payload.message)) {
            activeJobs.delete(sessionId);
            return;
          }
        }
      }
    } catch (err) {
      console.error("pollLogs error", err);
    }
    setTimeout(loop, 1000);
  }

  loop();
}
