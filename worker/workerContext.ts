// Session/workspace/env context

import {
  BUILDER_JOB_NAME,
  DEPLOYER_JOB_NAME,
  NEXT_PUBLIC_SUPABASE_URL,
  PORT,
  PROJECT_ID,
  REGION,
  SUPABASE_SECRET_KEY,
} from "../config/env.js";

let cachedJobContext: WorkerContext | null = null;

export function createWorkerContext() {
  return {
    port: PORT,
    builderJob: BUILDER_JOB_NAME,
    builderJobResource: `projects/${PROJECT_ID}/locations/${REGION}/jobs/${BUILDER_JOB_NAME}`,
    deployerJob: DEPLOYER_JOB_NAME,
    deployerJobResource: `projects/${PROJECT_ID}/locations/${REGION}/jobs/${DEPLOYER_JOB_NAME}`,
    supabaseSecretKey: SUPABASE_SECRET_KEY,
    supabaseUrl: NEXT_PUBLIC_SUPABASE_URL,
  };
}
export function getWorkerContext(): WorkerContext {
  if (!cachedJobContext) {
    cachedJobContext = createWorkerContext();
  }

  return cachedJobContext;
}

export type WorkerContext = ReturnType<typeof createWorkerContext>;
