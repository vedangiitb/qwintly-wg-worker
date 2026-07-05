import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import {
  validatePayload,
  normalizeGeneratePayload,
  normalizeDeployerPayload,
} from "../service/pubsub/validatePayload.js";
import { verifyPubsubPushAuth } from "../service/pubsub/verifyPubsubPushAuth.service.js";
import { makePubsubHandler } from "../service/pubsub/pubsubPushRoute.factory.js";
import * as decodeUtils from "../utils/decodePubsubMessageData.utils.js";
import * as bearerUtils from "../utils/extractBearerToken.utils.js";
import * as statusService from "../service/statusService/genSession.service.js";
import * as coreService from "../service/core/qwintlyCore.service.js";

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => {
  return {
    default: {
      verify: vi.fn(),
    },
  };
});

describe("Payload Normalizers", () => {
  it("normalizeGeneratePayload should correctly format generate payload", () => {
    const raw = {
      chatId: " chat-1 ",
      planId: " plan-2 ",
      userId: " user-3 ",
      requestType: "new",
      provider: "openai",
      model: "gpt-4",
      prevSessionId: " prev-4 ",
      sessionId: " sess-5 ",
      byokEnabled: "true",
    };
    const res = normalizeGeneratePayload(raw, "mock-job-token");
    expect(res).toEqual({
      chatId: "chat-1",
      planId: "plan-2",
      userId: "user-3",
      requestType: "new",
      provider: "openai",
      model: "gpt-4",
      prevSessionId: "prev-4",
      sessionId: "sess-5",
      jobToken: "mock-job-token",
      byokEnabled: true,
    });
  });

  it("normalizeDeployerPayload should correctly format deployer payload", () => {
    const raw = {
      chatId: "chat-1",
      planId: "plan-2",
      userId: "user-3",
      model: "gpt-4",
      provider: "openai",
      sessionId: "sess-5",
      snapshotId: "snap-6",
      byokEnabled: false,
    };
    const res = normalizeDeployerPayload(raw, "mock-job-token");
    expect(res).toEqual({
      chatId: "chat-1",
      planId: "plan-2",
      userId: "user-3",
      model: "gpt-4",
      provider: "openai",
      sessionId: "sess-5",
      snapshotId: "snap-6",
      jobToken: "mock-job-token",
      byokEnabled: false,
    });
  });

  it("should normalize boolean values correctly", () => {
    const raw = {
      chatId: "chat-1",
      planId: "plan-2",
      userId: "user-3",
      requestType: "new",
      provider: "openai",
      model: "gpt-4",
      sessionId: "sess-5",
      byokEnabled: "true",
    };
    const res = normalizeGeneratePayload(raw, "mock-job-token");
    expect(res.byokEnabled).toBe(true);
  });

  it("should throw for invalid byokEnabled string values", () => {
    const raw = {
      chatId: "chat-1",
      planId: "plan-2",
      userId: "user-3",
      requestType: "new",
      provider: "openai",
      model: "gpt-4",
      sessionId: "sess-5",
      byokEnabled: "invalid-boolean",
    };
    expect(() => normalizeGeneratePayload(raw, "mock-job-token")).toThrow(
      "Invalid byokEnabled value"
    );
  });

  it("should throw for non-string, non-boolean byokEnabled values", () => {
    const raw = {
      chatId: "chat-1",
      planId: "plan-2",
      userId: "user-3",
      requestType: "new",
      provider: "openai",
      model: "gpt-4",
      sessionId: "sess-5",
      byokEnabled: 12345,
    };
    expect(() => normalizeGeneratePayload(raw, "mock-job-token")).toThrow(
      "Invalid byokEnabled value"
    );
  });
});

describe("validatePayload", () => {
  const normalizer = (decoded: any, jobToken: string) => ({
    chatId: decoded.chatId,
    jobToken,
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate and return payload", () => {
    vi.mocked(jwt.verify).mockReturnValue({ chatId: "chat-123" });
    const rawPayload = JSON.stringify({ jobToken: "mock-token" });

    const result = validatePayload(rawPayload, normalizer);
    expect(result).toEqual({ chatId: "chat-123", jobToken: "mock-token" });
    expect(jwt.verify).toHaveBeenCalledWith("mock-token", "mock-publish-secret");
  });

  it("should throw if raw payload is invalid JSON", () => {
    expect(() => validatePayload("invalid-json", normalizer)).toThrow("Invalid JSON format");
  });

  it("should throw if jobToken is missing", () => {
    expect(() => validatePayload(JSON.stringify({}), normalizer)).toThrow("Missing jobToken");
  });

  it("should throw if normalizer yields empty values", () => {
    vi.mocked(jwt.verify).mockReturnValue({ chatId: "  " }); // Empty string normalized
    const rawPayload = JSON.stringify({ jobToken: "mock-token" });

    expect(() => validatePayload(rawPayload, normalizer)).toThrow(
      "All payload fields are required and cannot be empty"
    );
  });

  it("should validate deployer payload successfully (does not have prevSessionId)", () => {
    vi.mocked(jwt.verify).mockReturnValue({
      chatId: "chat-1",
      planId: "plan-2",
      userId: "user-3",
      model: "gpt-4",
      provider: "openai",
      sessionId: "sess-5",
      snapshotId: "snap-6",
      byokEnabled: false,
    });
    const rawPayload = JSON.stringify({ jobToken: "mock-token" });

    const result = validatePayload(rawPayload, normalizeDeployerPayload);
    expect(result).toBeDefined();
    expect(result.chatId).toBe("chat-1");
  });

  it("should throw if validatePayload encounters null or undefined field", () => {
    vi.mocked(jwt.verify).mockReturnValue({
      chatId: "chat-1",
      planId: null, // null value
      userId: "user-3",
      requestType: "new",
      provider: "openai",
      model: "gpt-4",
      sessionId: "sess-5",
      byokEnabled: true,
    });
    const rawPayload = JSON.stringify({ jobToken: "mock-token" });

    expect(() => validatePayload(rawPayload, normalizeGeneratePayload)).toThrow(
      "All payload fields are required and cannot be empty"
    );
  });

  it("should successfully pass non-string fields like byokEnabled in validatePayload check", () => {
    vi.mocked(jwt.verify).mockReturnValue({
      chatId: "chat-1",
      planId: "plan-2",
      userId: "user-3",
      requestType: "new",
      provider: "openai",
      model: "gpt-4",
      sessionId: "sess-5",
      byokEnabled: true, // boolean is not a string
    });
    const rawPayload = JSON.stringify({ jobToken: "mock-token" });

    const result = validatePayload(rawPayload, normalizeGeneratePayload);
    expect(result).toBeDefined();
  });
});

describe("verifyPubsubPushAuth", () => {
  const mockAuthClient = {
    verifyIdToken: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error if audience is missing", async () => {
    await expect(
      verifyPubsubPushAuth(mockAuthClient, {} as any, {} as any, undefined)
    ).rejects.toThrow("PUBSUB_PUSH_AUDIENCE not set");
  });

  it("should throw error if ID token extraction fails", async () => {
    vi.spyOn(bearerUtils, "extractBearerToken").mockReturnValue(null);
    await expect(
      verifyPubsubPushAuth(mockAuthClient, {} as any, {} as any, "audience")
    ).rejects.toThrow("ID token not found");
  });

  it("should verify token and return true if validation passes", async () => {
    vi.spyOn(bearerUtils, "extractBearerToken").mockReturnValue("my-id-token");
    mockAuthClient.verifyIdToken.mockResolvedValue({} as any);

    const res = await verifyPubsubPushAuth(mockAuthClient, {} as any, {} as any, "audience");
    expect(res).toBe(true);
    expect(mockAuthClient.verifyIdToken).toHaveBeenCalledWith({
      idToken: "my-id-token",
      audience: "audience",
    });
  });
});

describe("makePubsubHandler", () => {
  const mockGetWorkerContext = vi.fn();
  const mockAuthClient = {} as any;
  const mockJob = vi.fn();
  const mockFinishRPC = vi.fn();
  const mockNormalizer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 503 if context is not ready", async () => {
    mockGetWorkerContext.mockReturnValue(null);
    const handler = makePubsubHandler({
      getWorkerContext: mockGetWorkerContext,
      authClient: mockAuthClient,
      audience: "aud",
      job: mockJob,
      finishRPC: mockFinishRPC,
      normalizer: mockNormalizer,
    });

    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockRes = { status: statusMock } as any;

    await handler({} as any, mockRes);
    expect(statusMock).toHaveBeenCalledWith(503);
    expect(sendMock).toHaveBeenCalledWith("Worker not ready");
  });

  it("should return 204 if message decoding or validation fails", async () => {
    mockGetWorkerContext.mockReturnValue({});
    vi.spyOn(decodeUtils, "decodePubsubMessageData").mockImplementation(() => {
      throw new Error("Decode Error");
    });

    const handler = makePubsubHandler({
      getWorkerContext: mockGetWorkerContext,
      authClient: mockAuthClient,
      audience: "aud",
      job: mockJob,
      finishRPC: mockFinishRPC,
      normalizer: mockNormalizer,
    });

    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockRes = { status: statusMock } as any;

    await handler({} as any, mockRes);
    expect(statusMock).toHaveBeenCalledWith(204);
    expect(sendMock).toHaveBeenCalledWith("Invalid payload");
  });

  it("should return 500 if qwintly core service construction fails", async () => {
    mockGetWorkerContext.mockReturnValue({});
    vi.spyOn(decodeUtils, "decodePubsubMessageData").mockReturnValue(JSON.stringify({ jobToken: "tok" }));
    vi.mocked(jwt.verify).mockReturnValue({ chatId: "chat-1", sessionId: "sess-2", jobToken: "tok", byokEnabled: false });

    // Mock validatePayload using the actual imported function and normalizer
    const customNormalizer = (decoded: any, jobToken: string) => ({
      chatId: decoded.chatId,
      sessionId: decoded.sessionId,
      jobToken,
    } as any);

    vi.spyOn(coreService, "getQwintlyCore").mockImplementation(() => {
      throw new Error("Core Init Error");
    });

    const handler = makePubsubHandler({
      getWorkerContext: mockGetWorkerContext,
      authClient: mockAuthClient,
      audience: "aud",
      job: mockJob,
      finishRPC: mockFinishRPC,
      normalizer: customNormalizer,
    });

    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockRes = { status: statusMock } as any;

    await handler({} as any, mockRes);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(sendMock).toHaveBeenCalledWith("Failed to start session");
  });

  it("should run job successfully and return 204", async () => {
    mockGetWorkerContext.mockReturnValue({ test: "ctx" });
    vi.spyOn(decodeUtils, "decodePubsubMessageData").mockReturnValue(JSON.stringify({ jobToken: "tok" }));
    vi.mocked(jwt.verify).mockReturnValue({ chatId: "chat-1", sessionId: "sess-2", jobToken: "tok", byokEnabled: false });

    const customNormalizer = (decoded: any, jobToken: string) => ({
      chatId: decoded.chatId,
      sessionId: decoded.sessionId,
      jobToken,
    } as any);

    const mockStreamLog = vi.fn();
    vi.spyOn(coreService, "getQwintlyCore").mockReturnValue({
      streamLog: mockStreamLog,
    } as any);

    vi.spyOn(bearerUtils, "extractBearerToken").mockReturnValue("id-token");
    // Mock verifyPubsubPushAuth to succeed
    mockAuthClient.verifyIdToken = vi.fn().mockResolvedValue({});

    mockJob.mockResolvedValue(undefined);

    const handler = makePubsubHandler({
      getWorkerContext: mockGetWorkerContext,
      authClient: mockAuthClient,
      audience: "aud",
      job: mockJob,
      finishRPC: mockFinishRPC,
      normalizer: customNormalizer,
    });

    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockRes = { status: statusMock } as any;

    await handler({} as any, mockRes);
    expect(statusMock).toHaveBeenCalledWith(204);
    expect(mockJob).toHaveBeenCalled();
  });

  it("should log error, finish session, and return 204 if job or auth fails", async () => {
    mockGetWorkerContext.mockReturnValue({ test: "ctx" });
    vi.spyOn(decodeUtils, "decodePubsubMessageData").mockReturnValue(JSON.stringify({ jobToken: "tok" }));
    vi.mocked(jwt.verify).mockReturnValue({ chatId: "chat-1", sessionId: "sess-2", jobToken: "tok", byokEnabled: false });

    const customNormalizer = (decoded: any, jobToken: string) => ({
      chatId: decoded.chatId,
      sessionId: decoded.sessionId,
      jobToken,
    } as any);

    const mockStreamLog = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(coreService, "getQwintlyCore").mockReturnValue({
      streamLog: mockStreamLog,
    } as any);

    vi.spyOn(bearerUtils, "extractBearerToken").mockReturnValue("id-token");
    mockAuthClient.verifyIdToken = vi.fn().mockResolvedValue({});

    mockJob.mockRejectedValue(new Error("Job Failed"));
    const spyFinishSession = vi.spyOn(statusService, "finishSession").mockResolvedValue(undefined);

    const handler = makePubsubHandler({
      getWorkerContext: mockGetWorkerContext,
      authClient: mockAuthClient,
      audience: "aud",
      job: mockJob,
      finishRPC: mockFinishRPC,
      normalizer: customNormalizer,
    });

    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockRes = { status: statusMock } as any;

    await handler({} as any, mockRes);
    expect(statusMock).toHaveBeenCalledWith(204);
    expect(mockStreamLog).toHaveBeenCalledWith("Failed to start job", "generation_failed");
    expect(spyFinishSession).toHaveBeenCalledWith("sess-2", false, mockFinishRPC);
  });
});
