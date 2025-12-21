import { ExecutionsClient } from "@google-cloud/run";
import { sleep } from "./sleep.js";

export const POLL_INTERVAL_MS = 5000;
export const DISCOVERY_INTERVAL_MS = 2000;

const executionsClient = new ExecutionsClient({
  apiEndpoint: "asia-south1-run.googleapis.com",
});

export async function waitForExecutionByLabel(
  jobResource: string,
  sessionId: string
): Promise<string> {
  while (true) {
    const [executions] = await executionsClient.listExecutions({
      parent: jobResource,
    });

    const match = executions.find((e) => e.labels?.sessionId === sessionId);

    if (match?.name) {
      return match.name;
    }

    await sleep(DISCOVERY_INTERVAL_MS);
  }
}
