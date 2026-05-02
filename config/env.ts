import "dotenv/config";

export const PORT = process.env.PORT || 8080;

export const BUILDER_JOB_NAME = "qwintly-builder";
export const DEPLOYER_JOB_NAME = "qwintly-deployer";

export const PROJECT_ID = process.env.GCP_PROJECT_ID_QWINTLY;
export const REGION = process.env.REGION || "asia-south1";
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
export const PUBSUB_PUSH_AUDIENCE =
  process.env.PUBSUB_PUSH_AUDIENCE + "/pubsub/push";
export const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL_GEN_EVENTS;
export const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN_GEN_EVENTS;
