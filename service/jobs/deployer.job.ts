import { jobsClient } from "../../config/jobsClient.config.js";
import { activeJobs, pollLogs } from "../../utils/logger.js";
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

  console.log(
    sessionId,
    `Starting Deployer Cloud Run Job for session ${sessionId}`
  );
  const [operation] = await jobsClient.runJob(request);

  activeJobs.set(sessionId, {
    lastTimestamp: new Date().toISOString(),
    jobName: ctx.deployerJob,
  });

  console.log(
    sessionId,
    `Deployer Cloud Run Job started for session ${sessionId}`
  );

  // Start polling logs
  pollLogs(sessionId);

  try {
    await operation.promise();
  } finally {
    activeJobs.delete(sessionId);
  }
}
