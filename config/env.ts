import "dotenv/config";

export const PORT = process.env.PORT || 8080;
export const JOB_NAME = process.env.CLOUD_RUN_JOB_NAME!;
export const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT!;
export const REGION = process.env.CLOUD_RUN_REGION!;
export const BUCKET_NAME = process.env.BUCKET_NAME || "qwintly-builder-requests";
export const DEPLOYER_JOB_NAME = "qwintly-deployer";