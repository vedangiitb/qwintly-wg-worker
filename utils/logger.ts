import { Logging } from "@google-cloud/logging";
import { PROJECT_ID } from "../config/env.js";
import { statusService } from "../service/statusService/genStatus.service.js";
import { EVENT_TYPES, EventType, GEN_STEPS, GenStep } from "../types/events.js";
import { normalizeTimestamp } from "./normalizeTimeStamp.js";

const logging = new Logging({ projectId: PROJECT_ID });

export const LOG_POLL_CONFIG = {
  POLL_INTERVAL_MS: 1000,
  LOOKBACK_MS: 10_000,
  IDLE_MS: 3_000,
  MAX_DRAIN_MS: 30_000,
  TAIL_AFTER_TERMINAL_MS: 2_000,
  DEDUP_RING_SIZE: 500,
} as const;

type ActiveJobState = {
  lastTimestamp: string;
  jobName: string;
  completedAt?: string;
  terminalSeenAt?: string;
  seenIds: string[];
  lastEmittedAt?: string;
};
type StatusMeta = { eventType?: EventType; step?: GenStep; source?: string };

// Track active jobs -> execution state
export const activeJobs = new Map<string, ActiveJobState>();

const TERMINAL_STATUSES = new Set(["SUCCESS", "ERROR", "FAILED"]);

const resolveStepFromJobName = (jobName: string): GenStep =>
  jobName.toLowerCase().includes("deploy")
    ? GEN_STEPS.DEPLOYING
    : GEN_STEPS.BUILDING;

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
    return EVENT_TYPES.STEP_FINISHED;
  }

  return EVENT_TYPES.STEP_STARTED;
};

export async function broadCastLog(
  chatId: string,
  sessionId: string,
  message: string,
  meta: StatusMeta = {},
) {
  console.log(`Log for chatId: ${chatId}`, message, meta);
  try {
    await statusService(
      chatId,
      sessionId,
      meta.eventType ?? inferEventType(message),
      meta.step ?? GEN_STEPS.INITIATING,
      message,
      meta.source ?? "worker",
    );
  } catch (err) {
    console.error("Failed to emit status event", {
      chatId,
      message,
      meta,
      error: err,
    });
  }
}

const toIso = (d: Date) => d.toISOString();

const safeDate = (iso: string): Date | null => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const ringPush = (arr: string[], value: string, maxSize: number) => {
  arr.push(value);
  if (arr.length > maxSize) arr.splice(0, arr.length - maxSize);
};

export function pollLogs(chatId: string, sessionId: string): Promise<void> {
  return new Promise((resolve) => {
    async function loop() {
      try {
        const job = activeJobs.get(chatId);
        if (!job) {
          resolve();
          return;
        }

        const lastTsDate = safeDate(job.lastTimestamp) ?? new Date();
        const lookbackStart = toIso(
          new Date(lastTsDate.getTime() - LOG_POLL_CONFIG.LOOKBACK_MS),
        );

        const filter = `
resource.type="cloud_run_job"
resource.labels.job_name="${job.jobName}"
jsonPayload.type="STATUS"
jsonPayload.chatId="${chatId}"
jsonPayload.sessionId="${sessionId}"
timestamp >= "${lookbackStart}"
`;

        const [entries] = await logging.getEntries({
          filter,
          orderBy: "timestamp asc",
          pageSize: 50,
        });

        let maxSeenMs: number | null = null;

        for (const entry of entries) {
          const ts = entry.metadata.timestamp;
          if (!ts) continue;

          const tsIso = normalizeTimestamp(ts);
          const tsMs = new Date(tsIso).getTime();
          if (!Number.isNaN(tsMs)) {
            maxSeenMs = maxSeenMs === null ? tsMs : Math.max(maxSeenMs, tsMs);
          }

          const payload = entry.data as {
            chatId?: string;
            type?: string;
            message?: string;
          };

          if (
            payload?.type === "STATUS" &&
            payload?.chatId === chatId &&
            typeof payload?.message === "string"
          ) {
            const insertId =
              typeof entry.metadata.insertId === "string" &&
              entry.metadata.insertId.trim().length > 0
                ? entry.metadata.insertId
                : null;
            const dedupKey = insertId ?? `${tsIso}|${payload.message}`;

            if (job.seenIds.includes(dedupKey)) {
              continue;
            }
            ringPush(job.seenIds, dedupKey, LOG_POLL_CONFIG.DEDUP_RING_SIZE);

            await broadCastLog(chatId, sessionId, payload.message, {
              step: resolveStepFromJobName(job.jobName),
              source: `cloud_run_job:${job.jobName}`,
            });

            job.lastEmittedAt = new Date().toISOString();

            if (TERMINAL_STATUSES.has(payload.message)) {
              job.terminalSeenAt ??= new Date().toISOString();
            }
          }
        }

        if (maxSeenMs !== null) {
          const nextCursorIso = toIso(new Date(maxSeenMs + 1));
          const currentCursor = safeDate(job.lastTimestamp)?.getTime() ?? 0;
          if (maxSeenMs + 1 > currentCursor) {
            job.lastTimestamp = nextCursorIso;
          }
        }

        if (job.completedAt) {
          const completedMs = safeDate(job.completedAt)?.getTime() ?? 0;
          const drainDeadlineMs =
            completedMs + LOG_POLL_CONFIG.MAX_DRAIN_MS;

          const nowMs = Date.now();
          if (nowMs >= drainDeadlineMs) {
            activeJobs.delete(chatId);
            resolve();
            return;
          }

          const lastEmittedMs = job.lastEmittedAt
            ? safeDate(job.lastEmittedAt)?.getTime() ?? completedMs
            : completedMs;

          const terminalSeenMs = job.terminalSeenAt
            ? safeDate(job.terminalSeenAt)?.getTime() ?? 0
            : 0;

          const tailSatisfied =
            terminalSeenMs === 0 ||
            nowMs - terminalSeenMs >= LOG_POLL_CONFIG.TAIL_AFTER_TERMINAL_MS;

          const idleSatisfied =
            nowMs - lastEmittedMs >= LOG_POLL_CONFIG.IDLE_MS;

          if (tailSatisfied && idleSatisfied) {
            activeJobs.delete(chatId);
            resolve();
            return;
          }
        }
      } catch (err) {
        console.error("pollLogs error", err);
      }
      setTimeout(loop, LOG_POLL_CONFIG.POLL_INTERVAL_MS);
    }

    void loop();
  });
}
