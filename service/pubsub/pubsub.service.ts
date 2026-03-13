import { PubSub } from "@google-cloud/pubsub";
import { PROJECT_ID } from "../../config/env.js";
import { startWorkerFlow } from "../../flow/worker.flow.js";
import { EVENT_TYPES, GEN_STEPS } from "../../types/events.js";
import { broadCastLog, broadcastToAll } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

const pubsub = new PubSub({
  projectId: PROJECT_ID,
});

export async function startPubSubListener(ctx: WorkerContext) {
  const sub = process.env.PUBSUB_SUBSCRIPTION_WG;
  if (!sub) {
    throw new Error("Missing PUBSUB_SUBSCRIPTION env var");
  }

  const subscription = pubsub.subscription(sub);

  console.log("Listening for messages...");

  subscription.on("message", async (msg) => {
    let sessionId = "";
    try {
      const payload = JSON.parse(msg.data.toString());
      ({ chatId: sessionId } = payload);
      if (!sessionId) {
        throw new Error("Missing sessionId in payload");
      }

      await broadCastLog(sessionId, "Initializing session", {
        eventType: EVENT_TYPES.STEP_STARTED,
        step: GEN_STEPS.INITIATING,
        source: "pubsub",
      });

      startWorkerFlow(ctx, sessionId);

      console.log(sessionId, "Acking message");
      msg.ack();
      console.log(sessionId, "Message acked");
    } catch (err) {
      if (err instanceof Error && sessionId) {
        await broadCastLog(sessionId, `PubSub error: ${err.message}`, {
          eventType: EVENT_TYPES.STEP_ERROR,
          step: GEN_STEPS.INITIATING,
          source: "pubsub",
        });
      }
      msg.nack();
    }
  });

  subscription.on("error", async (err) => {
    console.error("SUBSCRIPTION ERROR:", err);
    await broadcastToAll(`SUBSCRIPTION ERROR: ${err}`, {
      eventType: EVENT_TYPES.STEP_ERROR,
      step: GEN_STEPS.INITIATING,
      source: "pubsub",
    });
  });

  subscription.on("close", async () => {
    console.log("SUBSCRIPTION CLOSED");
    await broadcastToAll("SUBSCRIPTION CLOSED", {
      eventType: EVENT_TYPES.STEP_FINISHED,
      step: GEN_STEPS.INITIATING,
      source: "pubsub",
    });
  });
}
