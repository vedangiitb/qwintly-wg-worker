import { PubSub } from "@google-cloud/pubsub";
import { PROJECT_ID } from "../../config/env.js";
import { savePayloadtoGCS } from "../../infra/gcs/savePayload.js";
import { spawnLocalBuilder } from "../../spawnLocalBuilder.js";
import { broadCastLog, broadcastToAll } from "../../utils/logger.js";
import { WorkerContext } from "../../worker/workerContext.js";
import { runBuilderJob } from "../runJobs/runBuilderJob.js";
import { runDeployerJob } from "../runJobs/runDeployerJob.js";

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

      if (process.env.LOCAL_MODE === "true") {
        await spawnLocalBuilder(sessionId, broadCastLog);
      } else {
        await runBuilderJob(ctx, sessionId);
        await runDeployerJob(ctx, sessionId);
      }
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
