import { supabase } from "../../config/supabase.js";

const assertNonEmpty = (value: string, field: string): void => {
  if (!value || !value.trim()) {
    throw new Error(`\`${field}\` must be a non-empty string`);
  }
};

export const startGenerationSession = async (
  chatId: string,
): Promise<string> => {
  assertNonEmpty(chatId, "chatId");

  const { data, error } = await supabase.rpc("start_generation_session", {
    p_conv_id: chatId,
  });

  if (error) {
    throw new Error(`Failed to start generation session: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to start generation session: empty response");
  }

  return data;
};

export const finishGenerationSession = async (
  chatId: string,
  genId: string,
) => {
  assertNonEmpty(chatId, "chatId");
  assertNonEmpty(genId, "genId");

  const { error } = await supabase.rpc("finish_generation_session", {
    p_conv_id: chatId,
    p_gen_id: genId,
  });

  if (error) {
    throw new Error(`Failed to finish generation session: ${error.message}`);
  }
};
