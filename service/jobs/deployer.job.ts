import { jobsClient } from "../../config/jobsClient.config.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import { activeJobs, broadCastLog, pollLogs } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

export async function runDeployerJob(
  ctx: WorkerContext,
  chatId: string,
  sessionId: string,
  requestType: string,
) {
  const jobParams = {
    CHAT_ID: chatId,
    SESSION_ID: sessionId,
    REQUEST_TYPE: requestType,
  };

  const request = {
    name: ctx.deployerJobResource,
    executionSuffix: chatId,
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

  await broadCastLog(chatId, sessionId, "Starting Deployer Job", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.DEPLOYING,
    source: "worker",
  });
  const [operation] = await jobsClient.runJob(request);
  activeJobs.set(chatId, {
    lastTimestamp: new Date().toISOString(),
    jobName: ctx.deployerJob,
  });

  await broadCastLog(chatId, sessionId, "Deployer Cloud Run Job started", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.DEPLOYING,
    source: "worker",
  });

  const logsComplete = pollLogs(chatId, sessionId);

  try {
    await operation.promise();
  } finally {
    // Give the poller up to 10 seconds to drain remaining logs before cleaning up.
    const LOG_DRAIN_TIMEOUT_MS = 10_000;
    await Promise.race([logsComplete, new Promise<void>((r) => setTimeout(r, LOG_DRAIN_TIMEOUT_MS))]);
    activeJobs.delete(chatId);
  }
}
