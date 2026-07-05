import { vi } from "vitest";

// Mock Environment Variables
process.env.PORT = "8080";
process.env.GCP_PROJECT_ID_QWINTLY = "mock-project";
process.env.REGION = "asia-south1";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock-supabase.co";
process.env.SUPABASE_SECRET_KEY = "mock-secret-key";
process.env.UPSTASH_REDIS_REST_URL_GEN_EVENTS = "https://mock-redis.co";
process.env.UPSTASH_REDIS_REST_TOKEN_GEN_EVENTS = "mock-token";
process.env.PUBSUB_PUSH_AUDIENCE = "https://mock-audience.co";
process.env.PUBLISH_SECRET = "mock-publish-secret";

// Mock Supabase to prevent real connections
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      rpc: vi.fn(),
      from: vi.fn(),
    })),
  };
});

// Mock Qwintly Core using ES6 class to support constructibility with 'new'
const streamLog = vi.fn().mockResolvedValue(undefined);
(globalThis as any).mockQwintlyCoreConstructor = vi.fn();

class MockQwintlyCore {
  constructor(...args: any[]) {
    (globalThis as any).mockQwintlyCoreConstructor(...args);
  }
  streamLog = streamLog;
}

vi.mock("@vedangiitb/qwintly-core", () => {
  return {
    QwintlyCore: MockQwintlyCore,
    EVENT_TYPES: {
      STEP_STARTED: "step_started",
      STEP_FINISHED: "step_finished",
      STEP_ERROR: "step_error",
      STEP_RETRY: "step_retry",
      GENERATION_COMPLETED: "generation_completed",
      GENERATION_FAILED: "generation_failed",
    },
    GEN_STEPS: {
      INITIATING: "initiating",
      BUILDING: "building",
      DEPLOYING: "deploying",
    },
  };
});
