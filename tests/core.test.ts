import { describe, it, expect, vi } from "vitest";
import { getQwintlyCore } from "../service/core/qwintlyCore.service.js";
import { QwintlyCore } from "@vedangiitb/qwintly-core";

describe("getQwintlyCore", () => {
  it("should construct QwintlyCore with environment config parameters", () => {
    const ctx = {
      chatId: "chat-123",
      sessionId: "sess-456",
      workspace: "work-path",
      step: "initiating",
    };

    const coreInstance = getQwintlyCore(ctx);

    const constructorSpy = (globalThis as any).mockQwintlyCoreConstructor;
    expect(constructorSpy).toHaveBeenCalledWith({
      chatId: "chat-123",
      sessionId: "sess-456",
      workspacePath: "work-path",
      source: "qwintly-wg-worker",
      step: "initiating",
      supabase: {
        endpoint: "https://mock-supabase.co",
        secret: "mock-secret-key",
      },
      upstash: {
        url: "https://mock-redis.co",
        token: "mock-token",
      },
    });

    expect(coreInstance).toBeDefined();
  });
});
