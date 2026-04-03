import { EventType, GenStep } from "../types/events.js";
import { DBRepository } from "./repository.js";

export type PersistedStatusEvent = {
  event_type: string;
  step?: string | null;
  message?: string | null;
  seq_num: number;
};

export class GenStatusRepository extends DBRepository {
  async persistStatusMessage(
    chatId: string,
    eventType: EventType,
    step: GenStep,
    message: string,
    source: string,
  ): Promise<PersistedStatusEvent> {
    const { data: lastEvent, error: seqError } = await this.client
      .from("generation_events")
      .select("seq_num")
      .eq("conv_id", chatId)
      .order("seq_num", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seqError) {
      throw new Error(`Failed fetching last seq_num: ${seqError.message}`);
    }

    const nextSeq = (lastEvent?.seq_num ?? 0) + 1;

    const { data, error } = await this.client
      .from("generation_events")
      .insert({
        conv_id: chatId,
        event_type: eventType,
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

    return data;
  }
}
