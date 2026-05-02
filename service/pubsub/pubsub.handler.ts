import { startWorkerFlow } from "../../flow/worker.flow.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import { WorkerContext } from "../../worker/workerContext.js";
import { getQwintlyCore } from "../core/qwintlyCore.service.js";
import { startGenerationSession } from "../statusService/genSession.service.js";
import jwt from "jsonwebtoken";

class InvalidPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayloadError";
  }
}

type HandlerStatus = "ok" | "invalid_payload" | "internal_error";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function handleWorkerRequest(
  ctx: WorkerContext,
  rawPayload: string,
): Promise<{ status: HandlerStatus; error?: Error }> {
  let chatId = "";
  let genId = "";

  try {
    const payload = JSON.parse(rawPayload) as {
      jobToken?: unknown;
    };
    const jobToken = normalizeString(payload?.jobToken);

    if (!jobToken) {
      throw new InvalidPayloadError("Missing jobToken");
    }

    let tokenPayload: {
      userId: string;
      provider: string;
      chatId: string;
      planId: string;
      requestType: string;
    };
    try {
      tokenPayload = jwt.verify(
        jobToken,
        process.env.PUBLISH_SECRET!,
      ) as typeof tokenPayload;
    } catch (err) {
      throw new InvalidPayloadError("Invalid or expired token");
    }

    chatId = normalizeString(tokenPayload.chatId);
    const planId = normalizeString(tokenPayload.planId);
    const requestType = normalizeString(tokenPayload.requestType);

    if (!chatId || !planId || !requestType) {
      throw new InvalidPayloadError("Missing chatId or planId in payload");
    }

    genId = await startGenerationSession(chatId, planId);

    if (!genId) {
      throw new Error("Failed to generate genId");
    }

    const core = getQwintlyCore({
      chatId,
      sessionId: genId,
      workspace: "test",
      step: GEN_STEPS.INITIATING,
    });

    await core.streamLog("Initializing session", EVENT_TYPES.STEP_STARTED);

    void startWorkerFlow(
      ctx,
      chatId,
      genId,
      planId,
      requestType,
      core,
      jobToken,
    );

    return { status: "ok" };
  } catch (err) {
    if (err instanceof InvalidPayloadError || err instanceof SyntaxError) {
      return { status: "invalid_payload", error: err as Error };
    }

    return { status: "internal_error", error: err as Error };
  }
}
