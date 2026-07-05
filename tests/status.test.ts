import { describe, it, expect, vi } from "vitest";
import { finishSession } from "../service/statusService/genSession.service.js";
import { supabase } from "../config/supabase.js";

describe("finishSession", () => {
  it("should successfully finish a session", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    await expect(finishSession("gen-123", true, mockRpc)).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith(supabase, "gen-123", true);
  });

  it("should throw error if genId is empty or whitespace", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    await expect(finishSession("   ", true, mockRpc)).rejects.toThrow("`genId` must be a non-empty string");
    await expect(finishSession("", true, mockRpc)).rejects.toThrow("`genId` must be a non-empty string");
  });

  it("should throw an error if the RPC call returns an error", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: { message: "DB Error" } });
    await expect(finishSession("gen-123", false, mockRpc)).rejects.toThrow(
      "Failed to finish generation session: DB Error"
    );
  });
});
