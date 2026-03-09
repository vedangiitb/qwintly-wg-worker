import { jobsClient } from "../../config/jobsClient.config.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import { activeJobs, broadCastLog, pollLogs } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

export async function runDeployerJob(ctx: WorkerContext, sessionId: string) {
  const jobParams = {
    SESSION_ID: sessionId,
  };

  const request = {
    name: ctx.deployerJobResource,
    executionSuffix: sessionId,
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

  await broadCastLog(sessionId, "Starting Deployer Job", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.DEPLOYING,
    source: "worker",
  });
  const [operation] = await jobsClient.runJob(request);
  // TODO: Should we do this? Why is it used?
  activeJobs.set(sessionId, {
    lastTimestamp: new Date().toISOString(),
    jobName: ctx.deployerJob,
  });

  await broadCastLog(sessionId, "Deployer Cloud Run Job started", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.DEPLOYING,
    source: "worker",
  });

  // Start polling logs
  pollLogs(sessionId);

  try {
    await operation.promise();
  } finally {
    activeJobs.delete(sessionId);
  }
}
