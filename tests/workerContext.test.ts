import { describe, it, expect } from "vitest";
import { createWorkerContext, getWorkerContext } from "../worker/workerContext.js";

describe("workerContext", () => {
  it("should create worker context with values from env", () => {
    const ctx = createWorkerContext();
    expect(ctx.port).toBe("8080");
    expect(ctx.builderJob).toBe("qwintly-builder");
    expect(ctx.builderJobResource).toBe("projects/mock-project/locations/asia-south1/jobs/qwintly-builder");
    expect(ctx.deployerJob).toBe("qwintly-deployer");
    expect(ctx.deployerJobResource).toBe("projects/mock-project/locations/asia-south1/jobs/qwintly-deployer");
    expect(ctx.supabaseSecretKey).toBe("mock-secret-key");
    expect(ctx.supabaseUrl).toBe("https://mock-supabase.co");
  });

  it("should return cached/same context on subsequent getWorkerContext calls", () => {
    const ctx1 = getWorkerContext();
    const ctx2 = getWorkerContext();
    expect(ctx1).toBe(ctx2);
  });
});
