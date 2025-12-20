import { JobsClient } from "@google-cloud/run";
import { PROJECT_ID } from "./env.js";

export const jobsClient = new JobsClient({ projectId: PROJECT_ID });
