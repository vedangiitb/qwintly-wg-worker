import { EVENT_TYPES, EventType } from "@vedangiitb/qwintly-core";
import { JobParams } from "../../types/jobParams.types.js";
import { runCloudRunJob } from "./runCloudRunJob.js";

export async function runBuilderJob(
  params: JobParams,
  logger: (message: string, eventType: EventType) => Promise<void>,
) {
  await runCloudRunJob({
    params,
    jobResource: params.ctx.builderJobResource,
    pipelineLabel: "builder",
    messages: {
      starting: "Starting Generation",
      started: "Generation started",
      failedPrefix: "Generation Failed",
    },
    eventTypes: {
      STEP_STARTED: EVENT_TYPES.STEP_STARTED,
      GENERATION_FAILED: EVENT_TYPES.GENERATION_FAILED,
    },
    logger,
  });
}
