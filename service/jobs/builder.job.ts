import { EVENT_TYPES, EventType } from "@vedangiitb/qwintly-core";
import { jobsClient } from "../../config/jobsClient.config.js";
import { JobParams } from "../../types/jobParams.types.js";

export async function runBuilderJob(
  params: JobParams,
  logger: (message: string, eventType: EventType) => Promise<void>,
) {
  try {
    const jobParams = {
      SESSION_ID: params.sessionId,
      JOB_TOKEN: params.jobToken,
    };

    const request = {
      name: params.ctx.builderJobResource,
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

    await logger(`Starting Generation`, EVENT_TYPES.STEP_STARTED);

    await jobsClient.runJob(request);

    await logger(`Generation started`, EVENT_TYPES.STEP_STARTED);
  } catch (err) {
    await logger(
      `Generation Failed: ${(err as Error).message}`,
      EVENT_TYPES.GENERATION_FAILED,
    );
    throw err;
  }
}
