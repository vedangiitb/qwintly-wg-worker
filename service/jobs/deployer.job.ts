import { jobsClient } from "../../config/jobsClient.config.js";
import { EVENT_TYPES, EventType } from "../../types/events.js";
import { JobParams } from "../../types/jobParams.types.js";

export async function runDeployerJob(
  params: JobParams,
  logger: (message: string, eventType: EventType) => Promise<void>,
) {
  try {
    const jobParams = {
      SESSION_ID: params.sessionId,
      JOB_TOKEN: params.jobToken,
    };
    const request = {
      name: params.ctx.deployerJobResource,
      executionSuffix: params.chatId,
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

    await logger(`Starting Deploying application`, EVENT_TYPES.STEP_STARTED);

    await jobsClient.runJob(request);

    await logger(`Deployment Started`, EVENT_TYPES.STEP_STARTED);
  } catch (err) {
    await logger(
      `Failed Deploying application: ${(err as Error).message}`,
      EVENT_TYPES.GENERATION_FAILED,
    );
    throw err;
  }
}
