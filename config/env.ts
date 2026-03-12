import "dotenv/config";

export const PORT = process.env.PORT || 8080;

export const BUILDER_JOB_NAME = "qwintly-builder-job";
export const DEPLOYER_JOB_NAME = "qwintly-deployer-job";

export const PROJECT_ID = process.env.GCP_PROJECT_ID_QWINTLY;
export const REGION = process.env.REGION || "asia-south1";
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;