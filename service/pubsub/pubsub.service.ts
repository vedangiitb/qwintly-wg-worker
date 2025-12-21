import { PubSub } from "@google-cloud/pubsub";
import { PROJECT_ID } from "../../config/env.js";
import { startWorkerFlow } from "../../flow/worker.flow.js";
import { savePayloadtoGCS } from "../../infra/gcs/savePayload.js";
import { broadCastLog, broadcastToAll } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";

const pubsub = new PubSub({
  projectId: PROJECT_ID,
});

export async function startPubSubListener(ctx: WorkerContext) {
  const subscription = pubsub.subscription(
    process.env.PUBSUB_SUBSCRIPTION || "website-generation-sub"
  );

  subscription.on("message", async (msg) => {
    try {
      const payload = JSON.parse(msg.data.toString());
      const { chatId: sessionId } = payload;
      if (!sessionId) {
        throw new Error("Missing sessionId in payload");
      }

      broadCastLog(sessionId, "Initializing session");

      console.log("Received job request:", payload);

      const filePath = `requests/${sessionId}.json`;
      const bucket = ctx.requestBucket;

      await savePayloadtoGCS(bucket, filePath, payload);

      console.log(sessionId, "Saved payload to GCS successfully");

      startWorkerFlow(ctx, sessionId);

      console.log(sessionId, "Acking message");
      msg.ack();
      console.log(sessionId, "Message acked");
    } catch (err) {
      console.error("PubSub error:", err);
      if (err instanceof Error) {
        broadCastLog(
          (JSON.parse(msg.data.toString()).chatId as string) || "",
          `PubSub error: ${err.message}`
        );
      }
      msg.nack();
    }
  });

  subscription.on("error", (err) => {
    console.error("SUBSCRIPTION ERROR:", err);
    broadcastToAll(`SUBSCRIPTION ERROR: ${err}`);
  });

  subscription.on("close", () => {
    console.log("SUBSCRIPTION CLOSED");
    broadcastToAll("SUBSCRIPTION CLOSED");
  });
}
