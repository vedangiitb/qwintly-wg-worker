import { supabase } from "../../config/supabase.js";
import { EventType, GenStep } from "../../types/events.js";

export const persistStatusMessage = async (
  sessionId: string,
  event_type: EventType,
  step: GenStep,
  message: string,
  source: string,
) => {
  // 1️⃣ Get next sequence number
  const { data: lastEvent, error: seqError } = await supabase
    .from("generation_events")
    .select("seq_num")
    .eq("conv_id", sessionId)
    .order("seq_num", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seqError) {
    throw new Error(`Failed fetching last seq_num: ${seqError.message}`);
  }

  const nextSeq = (lastEvent?.seq_num ?? 0) + 1;

  // 2️⃣ Insert new event
  const { data, error } = await supabase
    .from("generation_events")
    .insert({
      conv_id: sessionId,
      event_type,
      step,
      message,
      source,
      seq_num: nextSeq,
      last_modified: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed inserting generation event: ${error.message}`);
  }

  return data; // return inserted row for Redis streaming
};
