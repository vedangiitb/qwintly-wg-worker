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
        sessionId,
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
  const [execution] = await jobsClient.runJob(request);

  const executionId = execution.name!.split("/").pop()!;

  activeJobs.set(sessionId, {
    executionId,
    lastTimestamp: new Date().toISOString(),
    jobName: ctx.builderJob,
  });

  console.log(
    sessionId,
    `Builder Cloud Run Job started for session ${sessionId}`
  );

  // Start polling logs
  pollLogs(sessionId);
}
