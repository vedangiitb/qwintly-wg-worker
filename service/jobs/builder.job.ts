import { jobsClient } from "../../config/jobsClient.config.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import { activeJobs, broadCastLog, pollLogs } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

export async function runBuilderJob(
  ctx: WorkerContext,
  chatId: string,
  planId: string,
  requestType: string,
) {
  const jobParams = {
    CHAT_ID: chatId,
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

  console.log(
    chatId,
    `Starting Builder Cloud Run Job for session ${chatId}`,
  );
  await broadCastLog(chatId, "Starting Builder Job", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.BUILDING,
    source: "worker",
  });

  const [operation] = await jobsClient.runJob(request);

  // TODO: Should we do this? Why is it used?
  activeJobs.set(chatId, {
    lastTimestamp: new Date().toISOString(),
    jobName: ctx.builderJob,
  });

  console.log(
    chatId,
    `Builder Cloud Run Job started for session ${chatId}`,
  );

  await broadCastLog(chatId, "Builder Cloud Run Job started", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.BUILDING,
    source: "worker",
  });

  // Start polling logs
  pollLogs(chatId);

  await operation.promise();
}
