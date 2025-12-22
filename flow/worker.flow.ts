import { runBuilderJob } from "../service/jobs/builder.job.js";
import { runDeployerJob } from "../service/jobs/deployer.job.js";
import { spawnLocalBuilder } from "../spawnLocalBuilder.js";
import { broadCastLog } from "../utils/logger.js";
import { WorkerContext } from "../worker/workerContext.js";

export async function startWorkerFlow(ctx: WorkerContext, sessionId: string) {
  if (process.env.LOCAL_MODE === "true") {
    await spawnLocalBuilder(sessionId, broadCastLog);
  } else {
    try {
      await runBuilderJob(ctx, sessionId);

      broadCastLog(sessionId, "Builder completed. Starting deployer job");

      await runDeployerJob(ctx, sessionId);

      broadCastLog(sessionId, "Deployment successful");
      broadCastLog(sessionId, "SUCCESS");
    } catch (err) {
      broadCastLog(sessionId, `Pipeline failed: ${(err as Error).message}`);
    }
  }
}
