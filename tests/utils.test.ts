import { describe, it, expect, vi } from "vitest";
import { decodePubsubMessageData } from "../src/common/utils/pubsub.utils.js";
import { extractBearerToken } from "../src/common/utils/extract-bearer-token.utils.js";
import { normalizeTimestamp } from "../src/common/utils/timestamp.utils.js";
import type { Request, Response } from "express";

describe("decodePubsubMessageData", () => {
  it("should successfully decode base64 data", () => {
    const mockRequest = {
      body: {
        message: {
          data: Buffer.from("Hello World").toString("base64"),
        },
      },
    } as unknown as Request;

    const result = decodePubsubMessageData(mockRequest);
    expect(result).toBe("Hello World");
  });

  it("should throw an error if message data is missing", () => {
    const mockRequest = {
      body: {
        message: {},
      },
    } as unknown as Request;

    expect(() => decodePubsubMessageData(mockRequest)).toThrow("Invalid Pub/Sub message format");
  });

  it("should throw an error if message data is not a string", () => {
    const mockRequest = {
      body: {
        message: {
          data: 12345,
        },
      },
    } as unknown as Request;

    expect(() => decodePubsubMessageData(mockRequest)).toThrow("Invalid Pub/Sub message format");
  });
});

describe("extractBearerToken", () => {
  it("should extract token from Bearer auth header", () => {
    const mockRequest = {
      header: vi.fn().mockReturnValue("Bearer my-token-123"),
    } as unknown as Request;
    const mockResponse = {} as unknown as Response;

    const token = extractBearerToken(mockRequest, mockResponse);
    expect(token).toBe("my-token-123");
    expect(mockRequest.header).toHaveBeenCalledWith("authorization");
  });

  it("should extract token from headers field if header method is missing", () => {
    const mockRequest = {
      headers: { authorization: "Bearer header-token" },
    } as unknown as Request;
    const mockResponse = {} as unknown as Response;

    const token = extractBearerToken(mockRequest, mockResponse);
    expect(token).toBe("header-token");
  });

  it("should return null and set 401 when authorization header is missing Bearer prefix", () => {
    const mockRequest = {
      header: vi.fn().mockReturnValue("Basic user:pass"),
    } as unknown as Request;
    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockResponse = {
      status: statusMock,
    } as unknown as Response;

    const token = extractBearerToken(mockRequest, mockResponse);
    expect(token).toBeNull();
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(sendMock).toHaveBeenCalledWith("Missing bearer token");
  });

  it("should return null and set 401 when token is empty after Bearer", () => {
    const mockRequest = {
      header: vi.fn().mockReturnValue("Bearer "),
    } as unknown as Request;
    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockResponse = {
      status: statusMock,
    } as unknown as Response;

    const token = extractBearerToken(mockRequest, mockResponse);
    expect(token).toBeNull();
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(sendMock).toHaveBeenCalledWith("Missing bearer token");
  });

  it("should handle missing authorization header entirely", () => {
    const mockRequest = {
      header: vi.fn().mockReturnValue(undefined),
    } as unknown as Request;
    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockResponse = {
      status: statusMock,
    } as unknown as Response;

    const token = extractBearerToken(mockRequest, mockResponse);
    expect(token).toBeNull();
    expect(statusMock).toHaveBeenCalledWith(401);
    expect(sendMock).toHaveBeenCalledWith("Missing bearer token");
  });
});

describe("normalizeTimestamp", () => {
  it("should return string input directly", () => {
    const ts = "2026-07-05T18:49:43.000Z";
    expect(normalizeTimestamp(ts as any)).toBe(ts);
  });

  it("should return ISO string for Date instance", () => {
    const date = new Date("2026-07-05T18:49:43.000Z");
    expect(normalizeTimestamp(date as any)).toBe(date.toISOString());
  });

  it("should convert ITimestamp (seconds and nanos) to ISO string", () => {
    const timestamp = {
      seconds: 1783262983, // Some future date
      nanos: 123000000,
    };
    const expectedDate = new Date(1783262983 * 1000 + 123);
    expect(normalizeTimestamp(timestamp as any)).toBe(expectedDate.toISOString());
  });

  it("should convert ITimestamp without nanos correctly", () => {
    const timestamp = {
      seconds: 1783262983,
    };
    expect(normalizeTimestamp(timestamp as any)).toBe("");
  });

  it("should return empty string if invalid object format", () => {
    const invalidObj = {};
    expect(normalizeTimestamp(invalidObj as any)).toBe("");
  });
});
