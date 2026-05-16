import express from "express";
import { OAuth2Client } from "google-auth-library";
import {
  PORT,
  PUBSUB_PUSH_AUDIENCE_DEPLOY,
  PUBSUB_PUSH_AUDIENCE_GEN,
} from "./config/env.js";
import { runBuilderJob } from "./service/jobs/builder.job.js";
import { runDeployerJob } from "./service/jobs/deployer.job.js";
import { makePubsubHandler } from "./service/pubsub/pubsubPushRoute.factory.js";
import {
  normalizeDeployerPayload,
  normalizeGeneratePayload,
} from "./service/pubsub/validatePayload.js";
import { getWorkerContext, WorkerContext } from "./worker/workerContext.js";

const app = express();
app.use(express.json());
app.get("/", (_req, res) => res.status(200).send("ok"));
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
export const server = app.listen(PORT, () =>
  console.log(`Worker running on ${PORT}`),
);

const authClient = new OAuth2Client();
let workerCtx: WorkerContext = getWorkerContext();

app.post(
  "/pubsub/generate",
  makePubsubHandler({
    getWorkerContext: () => workerCtx,
    authClient,
    audience: PUBSUB_PUSH_AUDIENCE_GEN,
    job: runBuilderJob,
    finishRPC: (supabase: any, genId: string, success: boolean) =>
      supabase.rpc("finish_deployment", {
        p_gen_id: genId,
        p_success: success,
      }),
    normalizer: normalizeGeneratePayload,
  }),
);

app.post(
  "/pubsub/deploy",
  makePubsubHandler({
    getWorkerContext: () => workerCtx,
    authClient,
    audience: PUBSUB_PUSH_AUDIENCE_DEPLOY,
    job: runDeployerJob,
    finishRPC: (supabase: any, genId: string, success: boolean) =>
      supabase.rpc("finish_deployment", {
        p_gen_id: genId,
        p_success: success,
      }),
    normalizer: normalizeDeployerPayload,
  }),
);
