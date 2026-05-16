import jwt from "jsonwebtoken";
import { ProjectRequestType } from "../../types/request.types.js";

class InvalidPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayloadError";
  }
}

export type TokenPayload = {
  chatId: string;
  planId: string;
  sessionId: string;
  requestType: ProjectRequestType;
  provider: string;
  model: string;
  userId: string;
  jobToken: string;
};

export type GenPayload = {
  chatId: string;
  planId: string;
  userId: string;
  requestType: ProjectRequestType;
  provider: string;
  model: string;
  prevSessionId: string;
  sessionId: string;
  jobToken: string;
};

export type DeployerPayload = {
  chatId: string;
  planId: string;
  userId: string;
  model: string;
  provider: string;
  sessionId: string;
  snapshotId: string;
  jobToken: string;
};
const normalize = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

export const normalizeGeneratePayload = (
  decoded: any,
  jobToken: string,
): GenPayload => {
  return {
    chatId: normalize(decoded.chatId),
    planId: normalize(decoded.planId),
    userId: normalize(decoded.userId),
    requestType: normalize(decoded.requestType) as ProjectRequestType,
    provider: normalize(decoded.provider),
    model: normalize(decoded.model),
    prevSessionId: normalize(decoded.prevSessionId),
    sessionId: normalize(decoded.sessionId),
    jobToken: jobToken,
  };
};

export const normalizeDeployerPayload = (
  decoded: any,
  jobToken: string,
): DeployerPayload => ({
  chatId: normalize(decoded.chatId),
  planId: normalize(decoded.planId),
  userId: normalize(decoded.userId),
  model: normalize(decoded.model),
  provider: normalize(decoded.provider),
  sessionId: normalize(decoded.sessionId),
  snapshotId: normalize(decoded.snapshotId),
  jobToken: jobToken,
});

export const validatePayload = (
  rawPayload: string,
  normalizer: (decoded: any, jobToken: string) => GenPayload | DeployerPayload,
): GenPayload | DeployerPayload => {
  let parsed: any;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    throw new Error("Invalid JSON format");
  }

  const jobToken = normalize(parsed?.jobToken);
  if (!jobToken) {
    throw new Error("Missing jobToken");
  }

  const decoded = jwt.verify(jobToken, process.env.PUBLISH_SECRET!) as Record<
    string,
    unknown
  >;

  const payload = normalizer(decoded, jobToken);

  const hasEmptyFields = Object.values(payload).some((val) => !val);
  if (hasEmptyFields) {
    throw new InvalidPayloadError(
      "All payload fields are required and cannot be empty",
    );
  }

  return payload;
};
