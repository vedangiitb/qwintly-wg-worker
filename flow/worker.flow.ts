import { runBuilderJob } from "../service/jobs/builder.job.js";
import { runDeployerJob } from "../service/jobs/deployer.job.js";
import { finishGenerationSession } from "../service/statusService/genSession.service.js";
import { spawnLocalBuilder } from "../spawnLocalBuilder.js";
import { EVENT_TYPES, GEN_STEPS } from "../types/events.js";
import { ProjectRequestType } from "../types/request.types.js";
import { broadCastLog } from "../utils/logger.js";
import { WorkerContext } from "../worker/workerContext.js";

export async function startWorkerFlow(
  ctx: WorkerContext,
  chatId: string,
  sessionId: string,
  planId: string,
  requestType: string,
) {
  let step = GEN_STEPS.INITIATING;
  try {
    if (
      requestType !== ProjectRequestType.NEW &&
      requestType !== ProjectRequestType.UPDATE
    ) {
      throw new Error("Invalid request type");
    }
    if (process.env.LOCAL_MODE === "true") {
      step = GEN_STEPS.BUILDING;
      await spawnLocalBuilder(chatId, (sid, message) => {
        void broadCastLog(sid, sessionId, message, {
          step: GEN_STEPS.BUILDING,
          source: "local_builder",
        });
      });
    } else {
      step = GEN_STEPS.BUILDING;
      await runBuilderJob(ctx, chatId, sessionId, planId, requestType);

      await broadCastLog(
        chatId,
        sessionId,
        "Builder completed. Starting deployer job",
        {
          eventType: EVENT_TYPES.STEP_FINISHED,
          step: step,
          source: "worker",
        },
      );

      step = GEN_STEPS.DEPLOYING;
      await runDeployerJob(ctx, chatId, sessionId, requestType);

      await broadCastLog(chatId, sessionId, "Deployment successful", {
        eventType: EVENT_TYPES.STEP_FINISHED,
        step: step,
        source: "worker",
      });
      await broadCastLog(chatId, sessionId, "SUCCESS", {
        eventType: EVENT_TYPES.GENERATION_COMPLETED,
        step: step,
        source: "worker",
      });
    }
  } catch (err) {
    await broadCastLog(
      chatId,
      sessionId,
      `Pipeline failed: ${(err as Error).message}`,
      {
        eventType: EVENT_TYPES.GENERATION_FAILED,
        step: step,
        source: "worker_flow",
      },
    );
  } finally {
    await finishGenerationSession(chatId, sessionId);
  }
}
