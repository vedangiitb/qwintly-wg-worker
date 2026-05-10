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

const normalize = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

export const validatePayload = (
  rawPayload: string,
): TokenPayload | null | undefined => {
  let parsed: any;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    console.error("Invalid JSON format");
    return null;
  }

  const jobToken = normalize(parsed?.jobToken);
  if (!jobToken) {
    console.error("Missing jobToken");
    return null;
  }

  try {
    const decoded = jwt.verify(jobToken, process.env.PUBLISH_SECRET!) as Record<
      string,
      unknown
    >;

    const payload: TokenPayload = {
      chatId: normalize(decoded.chatId),
      planId: normalize(decoded.planId),
      requestType: normalize(decoded.requestType) as ProjectRequestType,
      provider: normalize(decoded.provider),
      model: normalize(decoded.model),
      userId: normalize(decoded.userId),
      sessionId: normalize(decoded.sessionId),
      jobToken: jobToken,
    };

    const hasEmptyFields = Object.values(payload).some((val) => !val);
    if (hasEmptyFields) {
      throw new InvalidPayloadError(
        "All payload fields are required and cannot be empty",
      );
    }

    if (!Object.values(ProjectRequestType).includes(payload.requestType)) {
      throw new InvalidPayloadError(
        `Invalid request type: ${payload.requestType}`,
      );
    }

    return payload;
  } catch (err) {
    console.error("Invalid or expired token");
    return null;
  }
};
