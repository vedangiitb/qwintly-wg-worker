import { ExecutionsClient } from "@google-cloud/run";
import { sleep } from "./sleep.js";

export const POLL_INTERVAL_MS = 10000;
export const DISCOVERY_INTERVAL_MS = 8000;
const MAX_DISCOVERY_MS = 4 * 60 * 1000;

const executionsClient = new ExecutionsClient({
  apiEndpoint: "asia-south1-run.googleapis.com",
});

export async function waitForExecutionByLabel(
  jobResource: string,
  sessionId: string
): Promise<string> {
  const endTime = Date.now() + MAX_DISCOVERY_MS; // 5 minutes from now
  while (Date.now() < endTime) {
    const [executions] = await executionsClient.listExecutions(
      {
        parent: jobResource,
      },
      { maxResults: 2 }
    );

    console.log(executions);

    const match = executions.find((e) => e.labels?.sessionId === sessionId);

    console.log("match", match);

    if (match?.name) {
      return match.name;
    }

    await sleep(DISCOVERY_INTERVAL_MS);
  }

  throw new Error(
    `Execution not created within ${
      MAX_DISCOVERY_MS / 1000
    }s for job ${jobResource}`
  );
}
