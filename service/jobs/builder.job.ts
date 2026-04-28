import { jobsClient } from "../../config/jobsClient.config.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import {
  LOG_POLL_CONFIG,
  activeJobs,
  broadCastLog,
  pollLogs,
} from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

export async function runBuilderJob(
  ctx: WorkerContext,
  chatId: string,
  sessionId: string,
  planId: string,
  requestType: string,
) {
  const jobParams = {
    CHAT_ID: chatId,
    SESSION_ID: sessionId,
    TASKS_PLAN_ID: planId,
    REQUEST_TYPE: requestType,
  };

  const request = {
    name: ctx.builderJobResource,
    overrides: {
      labels: {
        pipeline: "builder",
      },
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

  console.log(chatId, `Starting Builder Cloud Run Job for session ${chatId}`);
  await broadCastLog(chatId, sessionId, "Starting Builder Job", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.BUILDING,
    source: "worker",
  });

  const [operation] = await jobsClient.runJob(request);

  activeJobs.set(chatId, {
    lastTimestamp: new Date().toISOString(),
    jobName: ctx.builderJob,
    seenIds: [],
  });

  console.log(chatId, `Builder Cloud Run Job started for session ${chatId}`);

  await broadCastLog(chatId, sessionId, "Builder Cloud Run Job started", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.BUILDING,
    source: "worker",
  });

  // Start polling logs — returns a Promise that resolves when a terminal
  // status is seen (SUCCESS/ERROR/FAILED) or the 10s drain window expires.
  const logsComplete = pollLogs(chatId, sessionId);

  // Wait for the builder Cloud Run job to finish (authoritative signal).
  await operation.promise();

  const job = activeJobs.get(chatId);
  if (job) job.completedAt = new Date().toISOString();

  const LOG_DRAIN_TIMEOUT_MS = LOG_POLL_CONFIG.MAX_DRAIN_MS + 2_000;
  await Promise.race([
    logsComplete,
    new Promise<void>((r) => setTimeout(r, LOG_DRAIN_TIMEOUT_MS)),
  ]);

  // Clean up after drain — stops the poller if it's still running.
  activeJobs.delete(chatId);
}
