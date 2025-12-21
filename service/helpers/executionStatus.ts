import { ExecutionsClient } from "@google-cloud/run";

const executionsClient = new ExecutionsClient({
  apiEndpoint: "asia-south1-run.googleapis.com",
});

export type JobExecutionStatus = "RUNNING" | "SUCCEEDED" | "FAILED";

export async function getExecutionStatus(
  executionName: string
): Promise<JobExecutionStatus> {
  console.log(executionName);
  const [execution] = await executionsClient.getExecution({
    name: executionName,
  });

  const conditions = execution.conditions || [];

  const succeeded = conditions.find((c) => c.type === "Succeeded");

  if (!succeeded) {
    return "RUNNING";
  }

  if (succeeded.state === "CONDITION_SUCCEEDED") {
    return "SUCCEEDED";
  }

  if (succeeded.state === "CONDITION_FAILED") {
    return "FAILED";
  }

  return "RUNNING";
}
