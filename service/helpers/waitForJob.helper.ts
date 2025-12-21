import { waitForExecutionByLabel } from "./findExecution.js";
import { waitForExecutionCompletion } from "./waitForExecutionCompletion.js";

export type JobExecutionStatus = "RUNNING" | "SUCCEEDED" | "FAILED";

export async function waitForJob(
  jobResource: string, // projects/.../jobs/your-job
  sessionId: string // label value
): Promise<void> {
  // Step 1: discover the execution
  const executionName = await waitForExecutionByLabel(jobResource, sessionId);
  console.log(executionName)

  // Step 2: poll execution status
  await waitForExecutionCompletion(executionName);
}
