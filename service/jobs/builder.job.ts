import { jobsClient } from "../../config/jobsClient.config.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import { activeJobs, broadCastLog, pollLogs } from "../../utils/logger.js";
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
  });

  console.log(chatId, `Builder Cloud Run Job started for session ${chatId}`);

  await broadCastLog(chatId, sessionId, "Builder Cloud Run Job started", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.BUILDING,
    source: "worker",
  });

  // Start polling logs — returns a Promise that resolves when a terminal
  // status is seen, ensuring we drain all logs before the deployer starts.
  const logsComplete = pollLogs(chatId, sessionId);

  // Wait for both the job to finish AND all its logs to be flushed.
  // The log poller has a 5-minute timeout in case the terminal log never arrives.
  const LOG_DRAIN_TIMEOUT_MS = 5 * 60 * 1000;
  const logTimeout = new Promise<void>((r) => setTimeout(r, LOG_DRAIN_TIMEOUT_MS));
  await Promise.all([operation.promise(), Promise.race([logsComplete, logTimeout])]);

  // Safety cleanup in case the poller exited without seeing a terminal message.
  activeJobs.delete(chatId);
}
