import { QwintlyCore } from "@vedangiitb/qwintly-core";

export interface JobParams {
  core: QwintlyCore;
  chatId: string;
  sessionId: string;
  jobToken: string;
}
