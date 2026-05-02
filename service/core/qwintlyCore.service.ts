import { QwintlyCore } from "@vedangiitb/qwintly-core";
import {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  UPSTASH_TOKEN,
  UPSTASH_URL,
} from "../../config/env.js";

export type GenCtx = {
  chatId: string;
  sessionId: string;
  workspace: string;
  step: string;
};

export function getQwintlyCore(ctx: GenCtx): QwintlyCore {
  return new QwintlyCore({
    chatId: ctx.chatId,
    sessionId: ctx.sessionId,
    workspacePath: ctx.workspace,
    source: "qwintly-wg-worker",
    step: ctx.step,
    supabase: {
      endpoint: NEXT_PUBLIC_SUPABASE_URL!,
      secret: SUPABASE_SECRET_KEY!,
    },
    upstash: {
      url: UPSTASH_URL!,
      token: UPSTASH_TOKEN!,
    },
  });
}
