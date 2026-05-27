import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../config/supabase.js";

const assertNonEmpty = (value: string, field: string): void => {
  if (!value?.trim()) {
    throw new Error(`\`${field}\` must be a non-empty string`);
  }
};

export const finishSession = async (
  genId: string,
  success: boolean,
  rpc: (supabase: SupabaseClient, genId: string, success: boolean) => any,
) => {
  assertNonEmpty(genId, "genId");

  const { error } = await rpc(supabase, genId, success);

  if (error) {
    throw new Error(`Failed to finish generation session: ${error.message}`);
  }
};
