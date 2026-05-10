import { supabase } from "../../config/supabase.js";

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`\`${field}\` must be a non-empty string`);
  }
};

export const finishGenerationSession = async (
  chatId: string,
  genId: string,
  planId: string,
  success: boolean,
) => {
  assertNonEmpty(chatId, "chatId");
  assertNonEmpty(genId, "genId");

  const { error } = await supabase.rpc("finish_generation_session", {
    p_conv_id: chatId,
    p_gen_id: genId,
    p_plan_id: planId,
    p_success: success,
  });

  if (error) {
    throw new Error(`Failed to finish generation session: ${error.message}`);
  }
};
