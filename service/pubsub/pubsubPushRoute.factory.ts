import {
  EVENT_TYPES,
  EventType,
  GEN_STEPS,
  QwintlyCore,
} from "@vedangiitb/qwintly-core";
import type { Request, Response } from "express";
import type { OAuth2Client } from "google-auth-library";
import { JobParams } from "../../types/jobParams.types.js";
import { decodePubsubMessageData } from "../../utils/decodePubsubMessageData.utils.js";
import type { WorkerContext } from "../../worker/workerContext.js";
import { getQwintlyCore } from "../core/qwintlyCore.service.js";
import { finishGenerationSession } from "../statusService/genSession.service.js";
import { validatePayload } from "./validatePayload.js";
import { verifyPubsubPushAuth } from "./verifyPubsubPushAuth.service.js";

type MakePubsubHandlerParams = {
  getWorkerContext: () => WorkerContext | null | undefined;
  authClient: OAuth2Client;
  audience: string | undefined;
  job: (
    params: JobParams,
    logger: (message: string, eventType: EventType) => Promise<void>,
  ) => Promise<void>;
};

export function makePubsubHandler({
  getWorkerContext,
  authClient,
  audience,
  job,
}: MakePubsubHandlerParams) {
  return async (req: Request, res: Response) => {
    const ctx = getWorkerContext();
    if (!ctx) {
      return res.status(503).send("Worker not ready");
    }

    const ok = await verifyPubsubPushAuth(authClient, req, res, audience);
    if (!ok) return res.status(204).send("Forbidden");

    const decoded = decodePubsubMessageData(req);
    if (!decoded) return res.status(204).send("Invalid data");

    const payload = validatePayload(decoded);
    if (!payload) return res.status(204).send("Invalid data");

    let core: QwintlyCore;

    try {
      core = getQwintlyCore({
        chatId: payload.chatId,
        sessionId: payload.sessionId,
        workspace: "test",
        step: GEN_STEPS.INITIATING,
      });
    } catch (error) {
      console.error("Pub/Sub handling error", error);
      return res.status(500).send("Failed to start session");
    }

    try {
      await core.streamLog("Initializing session", EVENT_TYPES.STEP_STARTED);

      const jobParams: JobParams = {
        ctx,
        core,
        chatId: payload.chatId,
        sessionId: payload.sessionId,
        jobToken: payload.jobToken,
      };

      await job(jobParams, core.streamLog.bind(core));

      return res.status(204).send();
    } catch (err) {
      await core.streamLog(
        "Failed to start job",
        EVENT_TYPES.GENERATION_FAILED,
      );
      console.error("Pub/Sub handling error", err);
      await finishGenerationSession(
        payload.chatId,
        payload.sessionId,
        payload.planId,
        false,
      );
      return res.status(204).send();
    }
  };
}
