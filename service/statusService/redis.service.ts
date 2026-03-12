import { redis } from "../../config/redis.js";

export const sendStatusToRedis = async (
  sessionId: string,
  event: {
    event_type: string;
    step?: string;
    message?: string;
    seq_num: number;
  },
) => {
  const streamKey = `chat:${sessionId}:events`;

  await redis.xadd(
    streamKey,
    "*",
    {
      event_type: event.event_type,
      step: event.step ?? "",
      message: event.message ?? "",
      seq_num: event.seq_num.toString(),
    },
    {
      trim: {
        type: "MAXLEN",
        threshold: 1000,
        comparison: "=",
      },
    },
  );

  // Optional: update fast-access state
  await redis.hset(`chat:${sessionId}:state`, {
    current_status: event.event_type,
    last_seq: event.seq_num.toString(),
  });
};
