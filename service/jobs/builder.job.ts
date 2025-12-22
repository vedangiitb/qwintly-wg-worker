import { jobsClient } from "../../config/jobsClient.config.js";
import { activeJobs, pollLogs } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

export async function runBuilderJob(ctx: WorkerContext, sessionId: string) {
  const jobParams = {
    SESSION_ID: sessionId,
    REQUEST_TYPE: "new",
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
  };

  const request = {
    name: ctx.builderJobResource,
    overrides: {
      labels: {
        sessiond_id: sessionId,
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
    sessionId,
    `Starting Builder Cloud Run Job for session ${sessionId}`
  );

  const [operation] = await jobsClient.runJob(request);

  activeJobs.set(sessionId, {
    lastTimestamp: new Date().toISOString(),
    jobName: ctx.builderJob,
  });

  console.log(
    sessionId,
    `Builder Cloud Run Job started for session ${sessionId}`
  );

  // Start polling logs
  pollLogs(sessionId);

  await operation.promise();
}
