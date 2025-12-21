import { getExecutionStatus } from "./executionStatus.js";
import { sleep } from "./sleep.js";

export async function waitForExecutionCompletion(
  executionName: string
): Promise<void> {
  while (true) {
    const status = await getExecutionStatus(executionName);

    if (status === "SUCCEEDED") return;

    if (status === "FAILED") {
      throw new Error(`Job execution failed: ${executionName}`);
    }

    await sleep(5000);
  }
}
