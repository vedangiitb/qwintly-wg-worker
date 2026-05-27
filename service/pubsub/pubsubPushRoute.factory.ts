import { SupabaseClient } from "@supabase/supabase-js";
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
import { finishSession } from "../statusService/genSession.service.js";
import {
  DeployerPayload,
  GenPayload,
  validatePayload,
} from "./validatePayload.js";
import { verifyPubsubPushAuth } from "./verifyPubsubPushAuth.service.js";

type MakePubsubHandlerParams = {
  getWorkerContext: () => WorkerContext | null | undefined;
  authClient: OAuth2Client;
  audience: string | undefined;
  job: (
    params: JobParams,
    logger: (message: string, eventType: EventType) => Promise<void>,
  ) => Promise<void>;
  finishRPC: (supabase: SupabaseClient, genId: string, success: boolean) => any;
  normalizer: (decoded: any, jobToken: string) => GenPayload | DeployerPayload;
};

export function makePubsubHandler({
  getWorkerContext,
  authClient,
  audience,
  job,
  finishRPC,
  normalizer,
}: MakePubsubHandlerParams) {
  return async (req: Request, res: Response) => {
    const ctx = getWorkerContext();
    if (!ctx) {
      return res.status(503).send("Worker not ready");
    }

    let core: QwintlyCore;
    let decoded: string;
    let payload: GenPayload | DeployerPayload;

    try {
      decoded = decodePubsubMessageData(req);
      payload = validatePayload(decoded, normalizer);
    } catch (err) {
      console.error("Pub/Sub handling error", err);
      return res.status(204).send("Invalid payload");
    }

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
      await verifyPubsubPushAuth(authClient, req, res, audience);

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
      await finishSession(payload.sessionId, false, finishRPC);
      return res.status(204).send();
    }
  };
}
