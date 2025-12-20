// Session/workspace/env context

import {
  BUCKET_NAME,
  DEPLOYER_JOB_NAME,
  JOB_NAME,
  PORT,
  PROJECT_ID,
  REGION,
} from "../config/env.js";

export function createWorkerContext() {
  return {
    port: PORT,
    builderJob: JOB_NAME,
    builderJobResource: `projects/${PROJECT_ID}/locations/${REGION}/jobs/${JOB_NAME}`,
    deployerJob: DEPLOYER_JOB_NAME,
    deployerJobResource: `projects/${PROJECT_ID}/locations/${REGION}/jobs/${DEPLOYER_JOB_NAME}`,
    requestBucket: BUCKET_NAME,
  };
}

export type WorkerContext = ReturnType<typeof createWorkerContext>;
