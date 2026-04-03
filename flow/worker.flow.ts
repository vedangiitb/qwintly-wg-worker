import { runBuilderJob } from "../service/jobs/builder.job.js";
import { runDeployerJob } from "../service/jobs/deployer.job.js";
import {
  finishGenerationSession,
  startGenerationSession,
} from "../service/statusService/genSession.service.js";
import { spawnLocalBuilder } from "../spawnLocalBuilder.js";
import { EVENT_TYPES, GEN_STEPS } from "../types/events.js";
import { ProjectRequestType } from "../types/request.types.js";
import { broadCastLog } from "../utils/logger.js";
import { WorkerContext } from "../worker/workerContext.js";

export async function startWorkerFlow(
  ctx: WorkerContext,
  chatId: string,
  planId: string,
  requestType: string,
) {
  if (
    requestType !== ProjectRequestType.NEW &&
    requestType !== ProjectRequestType.UPDATE
  ) {
    throw new Error("Invalid request type");
  }
  if (process.env.LOCAL_MODE === "true") {
    await spawnLocalBuilder(chatId, (sid, message) => {
      void broadCastLog(sid, message, {
        step: GEN_STEPS.BUILDING,
        source: "local_builder",
      });
    });
  } else {
    let genId: string = "";
    try {
      genId = await startGenerationSession(chatId);
      if (!genId) {
        throw new Error("Received empty genId");
      }
      await runBuilderJob(ctx, chatId, planId, requestType);

      await broadCastLog(
        chatId,
        "Builder completed. Starting deployer job",
        {
          eventType: EVENT_TYPES.STEP_FINISHED,
          step: GEN_STEPS.BUILDING,
          source: "worker",
        },
      );

      await runDeployerJob(ctx, chatId);

      await broadCastLog(chatId, "Deployment successful", {
        eventType: EVENT_TYPES.STEP_FINISHED,
        step: GEN_STEPS.DEPLOYING,
        source: "worker",
      });
      await broadCastLog(chatId, "SUCCESS", {
        eventType: EVENT_TYPES.GENERATION_COMPLETED,
        step: GEN_STEPS.DEPLOYING,
        source: "worker",
      });
    } catch (err) {
      await broadCastLog(
        chatId,
        `Pipeline failed: ${(err as Error).message}`,
        {
          eventType: EVENT_TYPES.GENERATION_FAILED,
          step: GEN_STEPS.DEPLOYING,
          source: "worker_flow",
        },
      );
    } finally {
      if (genId) {
        await finishGenerationSession(chatId, genId);
      }
    }
  }
}
