import { EVENT_TYPES, EventType } from "../../types/events.js";
import { JobParams } from "../../types/jobParams.types.js";
import { runCloudRunJob } from "./runCloudRunJob.js";

export async function runDeployerJob(
  params: JobParams,
  logger: (message: string, eventType: EventType) => Promise<void>,
) {
  await runCloudRunJob({
    params,
    jobResource: params.ctx.deployerJobResource,
    executionSuffix: params.chatId,
    messages: {
      starting: "Starting Deploying application",
      started: "Deployment Started",
      failedPrefix: "Failed Deploying application",
    },
    eventTypes: {
      STEP_STARTED: EVENT_TYPES.STEP_STARTED,
      GENERATION_FAILED: EVENT_TYPES.GENERATION_FAILED,
    },
    logger,
  });
}
