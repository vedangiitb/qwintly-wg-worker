import { Timestamp } from "@google-cloud/logging/build/src/entry.js";

export function normalizeTimestamp(ts: Timestamp): string {
  if (typeof ts === "string") return ts;

  if (ts instanceof Date) {
    return ts.toISOString();
  }

  // ITimestamp case
  if (ts.seconds && ts.nanos) {
    const millis =
      Number(ts.seconds) * 1000 + Math.floor(Number(ts.nanos ?? 0) / 1e6);
    return new Date(millis).toISOString();
  }

  return "";
}
