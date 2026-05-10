import { QwintlyCore } from "@vedangiitb/qwintly-core";
import { WorkerContext } from "../worker/workerContext.js";

export type JobParams = {
  ctx: WorkerContext;
  core: QwintlyCore;
  chatId: string;
  sessionId: string;
  jobToken: string;
};
