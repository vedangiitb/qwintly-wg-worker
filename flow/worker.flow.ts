import { QwintlyCore } from "@vedangiitb/qwintly-core";
import { runBuilderJob } from "../service/jobs/builder.job.js";
import { runDeployerJob } from "../service/jobs/deployer.job.js";
import { finishGenerationSession } from "../service/statusService/genSession.service.js";
import { spawnLocalBuilder } from "../spawnLocalBuilder.js";
import { EVENT_TYPES } from "../types/events.js";
import { ProjectRequestType } from "../types/request.types.js";
import { WorkerContext } from "../worker/workerContext.js";

export async function startWorkerFlow(
  ctx: WorkerContext,
  chatId: string,
  sessionId: string,
  planId: string,
  requestType: string,
  core: QwintlyCore,
) {
  let success = false;
  try {
    if (
      requestType !== ProjectRequestType.NEW &&
      requestType !== ProjectRequestType.UPDATE
    ) {
      throw new Error("Invalid request type");
    }
    if (process.env.LOCAL_MODE === "true") {
      await spawnLocalBuilder(chatId, (sid, message) => {
        core.streamLog(message, EVENT_TYPES.STEP_STARTED);
      });
    } else {
      await runBuilderJob(
        ctx,
        chatId,
        sessionId,
        planId,
        requestType,
        core.streamLog,
      );

      await core.streamLog(
        "Builder completed. Starting deployer job",
        EVENT_TYPES.STEP_FINISHED,
      );

      await runDeployerJob(ctx, chatId, sessionId, requestType, core.streamLog);

      await core.streamLog("Deployment successful", EVENT_TYPES.STEP_FINISHED);
      await core.streamLog("SUCCESS", EVENT_TYPES.GENERATION_COMPLETED);
    }
    success = true;
  } catch (err) {
    await core.streamLog(
      `Pipeline failed: ${(err as Error).message}`,
      EVENT_TYPES.GENERATION_FAILED,
    );
  } finally {
    await finishGenerationSession(chatId, sessionId, planId, success);
  }
}
