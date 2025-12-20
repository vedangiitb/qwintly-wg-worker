import { startPubSubListener } from "../service/pubsub/pubsub.service.js";
import { createWorkerContext } from "./workerContext.js";

export async function startWorker() {
  const ctx = createWorkerContext();

  try {
    startPubSubListener(ctx);
  } catch (error) {
    console.error(error);
  }
}
