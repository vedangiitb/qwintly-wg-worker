import { jobsClient } from "../../config/jobsClient.config.js";
import { EVENT_TYPES, EventType } from "../../types/events.js";
import { WorkerContext } from "../../worker/workerContext.js";

export async function runDeployerJob(
  ctx: WorkerContext,
  chatId: string,
  sessionId: string,
  requestType: string,
  logger: (message: string, eventType: EventType) => Promise<void>,
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

  await logger(`Starting Deployer Cloud Run Job`, EVENT_TYPES.STEP_STARTED);

  const [operation] = await jobsClient.runJob(request);

  await logger(`Deployer Cloud Run Job started`, EVENT_TYPES.STEP_STARTED);

  await operation.promise();
}
