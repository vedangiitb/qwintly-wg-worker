import { jobsClient } from "../../config/jobsClient.config.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import { activeJobs, broadCastLog, pollLogs } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

export async function runBuilderJob(ctx: WorkerContext, sessionId: string) {
  const jobParams = {
    SESSION_ID: sessionId,
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
    `Starting Builder Cloud Run Job for session ${sessionId}`,
  );
  await broadCastLog(sessionId, "Starting Builder Job", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.BUILDING,
    source: "worker",
  });

  const [operation] = await jobsClient.runJob(request);

  // TODO: Should we do this? Why is it used?
  activeJobs.set(sessionId, {
    lastTimestamp: new Date().toISOString(),
    jobName: ctx.builderJob,
  });

  console.log(
    sessionId,
    `Builder Cloud Run Job started for session ${sessionId}`,
  );

  await broadCastLog(sessionId, "Builder Cloud Run Job started", {
    eventType: EVENT_TYPES.STEP_STARTED,
    step: GEN_STEPS.BUILDING,
    source: "worker",
  });

  // Start polling logs
  pollLogs(sessionId);

  await operation.promise();
}
