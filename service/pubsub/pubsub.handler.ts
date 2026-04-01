import { startWorkerFlow } from "../../flow/worker.flow.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import { broadCastLog } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

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
  let sessionId = "";

  try {
    const payload = JSON.parse(rawPayload) as {
      chatId?: unknown;
      planId?: unknown;
      requestType?: unknown;
    };

    sessionId = normalizeString(payload?.chatId);
    const planId = normalizeString(payload?.planId);
    const requestType = normalizeString(payload?.requestType);

    if (!sessionId || !planId || !requestType) {
      throw new InvalidPayloadError("Missing sessionId or planId in payload");
    }

    await broadCastLog(sessionId, "Initializing session", {
      eventType: EVENT_TYPES.STEP_STARTED,
      step: GEN_STEPS.INITIATING,
      source: "pubsub",
    });

    void startWorkerFlow(ctx, sessionId, planId, requestType);

    return { status: "ok" };
  } catch (err) {
    if (err instanceof Error && sessionId) {
      await broadCastLog(sessionId, `PubSub error: ${err.message}`, {
        eventType: EVENT_TYPES.STEP_ERROR,
        step: GEN_STEPS.INITIATING,
        source: "pubsub",
      });
    }

    if (err instanceof InvalidPayloadError || err instanceof SyntaxError) {
      return { status: "invalid_payload", error: err as Error };
    }

    return { status: "internal_error", error: err as Error };
  }
}
