import { EVENT_TYPES, EventType } from "@vedangiitb/qwintly-core";
import { jobsClient } from "../../config/jobsClient.config.js";
import { WorkerContext } from "../../worker/workerContext.js";

export async function runBuilderJob(
  ctx: WorkerContext,
  sessionId: string,
  jobToken: string,
  logger: (message: string, eventType: EventType) => Promise<void>,
) {
  const jobParams = {
    SESSION_ID: sessionId,
    JOB_TOKEN: jobToken,
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

  await logger(`Starting Builder Cloud Run Job`, EVENT_TYPES.STEP_STARTED);

  const [operation] = await jobsClient.runJob(request);

  await logger(`Builder Cloud Run Job started`, EVENT_TYPES.STEP_STARTED);

  await operation.promise();
}
