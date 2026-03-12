import { runBuilderJob } from "../service/jobs/builder.job.js";
import { runDeployerJob } from "../service/jobs/deployer.job.js";
import { spawnLocalBuilder } from "../spawnLocalBuilder.js";
import { EVENT_TYPES, GEN_STEPS } from "../types/events.js";
import { broadCastLog } from "../utils/logger.js";
import { WorkerContext } from "../worker/workerContext.js";

export async function startWorkerFlow(ctx: WorkerContext, sessionId: string) {
  if (process.env.LOCAL_MODE === "true") {
    await spawnLocalBuilder(sessionId, (sid, message) => {
      void broadCastLog(sid, message, {
        step: "BUILDING",
        source: "local_builder",
      });
    });
  } else {
    try {
      await runBuilderJob(ctx, sessionId);

      await broadCastLog(
        sessionId,
        "Builder completed. Starting deployer job",
        {
          eventType: EVENT_TYPES.STEP_FINISHED,
          step: GEN_STEPS.BUILDING,
          source: "worker",
        },
      );

      await runDeployerJob(ctx, sessionId);

      await broadCastLog(sessionId, "Deployment successful", {
        eventType: EVENT_TYPES.STEP_FINISHED,
        step: GEN_STEPS.DEPLOYING,
        source: "worker",
      });
      await broadCastLog(sessionId, "SUCCESS", {
        eventType: EVENT_TYPES.GENERATION_COMPLETED,
        step: GEN_STEPS.DEPLOYING,
        source: "worker",
      });
    } catch (err) {
      await broadCastLog(
        sessionId,
        `Pipeline failed: ${(err as Error).message}`,
        {
          eventType: "GENERATION_FAILED",
          step: "DEPLOYING",
          source: "worker_flow",
        },
      );
    }
  }
}
