import { describe, it, expect, vi, beforeEach } from "vitest";
import { runCloudRunJob } from "../service/jobs/runCloudRunJob.js";
import { runBuilderJob } from "../service/jobs/builder.job.js";
import { runDeployerJob } from "../service/jobs/deployer.job.js";
import { jobsClient } from "../config/jobsClient.config.js";

// Mock jobsClient config
vi.mock("../config/jobsClient.config.js", () => {
  return {
    jobsClient: {
      runJob: vi.fn(),
    },
  };
});

describe("runCloudRunJob", () => {
  const mockParams = {
    sessionId: "session-123",
    jobToken: "token-abc",
    chatId: "chat-456",
    ctx: {
      builderJobResource: "projects/mock/locations/asia/jobs/builder",
      deployerJobResource: "projects/mock/locations/asia/jobs/deployer",
    },
  } as any;

  const mockLogger = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully run Cloud Run job and log progress", async () => {
    vi.mocked(jobsClient.runJob).mockResolvedValue({} as any);

    const options = {
      params: mockParams,
      jobResource: "my-job-resource",
      executionSuffix: "suffix",
      pipelineLabel: "label",
      messages: {
        starting: "starting-msg",
        started: "started-msg",
        failedPrefix: "failed-msg",
      },
      eventTypes: {
        STEP_STARTED: "step_started",
        GENERATION_FAILED: "generation_failed",
      },
      logger: mockLogger,
    };

    await expect(runCloudRunJob(options)).resolves.toBeUndefined();

    expect(mockLogger).toHaveBeenCalledWith("starting-msg", "step_started");
    expect(jobsClient.runJob).toHaveBeenCalledWith({
      name: "my-job-resource",
      executionSuffix: "suffix",
      overrides: {
        labels: { pipeline: "label" },
        containerOverrides: [
          {
            env: [
              { name: "SESSION_ID", value: "session-123" },
              { name: "JOB_TOKEN", value: "token-abc" },
            ],
          },
        ],
      },
    });
    expect(mockLogger).toHaveBeenCalledWith("started-msg", "step_started");
  });

  it("should log failure and rethrow if jobsClient.runJob throws error", async () => {
    const error = new Error("GCP connection error");
    vi.mocked(jobsClient.runJob).mockRejectedValue(error);

    const options = {
      params: mockParams,
      jobResource: "my-job-resource",
      messages: {
        starting: "starting-msg",
        started: "started-msg",
        failedPrefix: "failed-msg",
      },
      eventTypes: {
        STEP_STARTED: "step_started",
        GENERATION_FAILED: "generation_failed",
      },
      logger: mockLogger,
    };

    await expect(runCloudRunJob(options)).rejects.toThrow("GCP connection error");

    expect(mockLogger).toHaveBeenCalledWith("starting-msg", "step_started");
    expect(mockLogger).toHaveBeenCalledWith("failed-msg: GCP connection error", "generation_failed");
  });
});

describe("runBuilderJob", () => {
  it("should delegate to runCloudRunJob correctly", async () => {
    vi.mocked(jobsClient.runJob).mockResolvedValue({} as any);
    const mockLogger = vi.fn().mockResolvedValue(undefined);
    const mockParams = {
      sessionId: "session-123",
      jobToken: "token-abc",
      ctx: {
        builderJobResource: "builder-resource-123",
      },
    } as any;

    await runBuilderJob(mockParams, mockLogger);

    expect(jobsClient.runJob).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "builder-resource-123",
        overrides: expect.objectContaining({
          labels: { pipeline: "builder" },
        }),
      })
    );
  });
});

describe("runDeployerJob", () => {
  it("should delegate to runCloudRunJob correctly", async () => {
    vi.mocked(jobsClient.runJob).mockResolvedValue({} as any);
    const mockLogger = vi.fn().mockResolvedValue(undefined);
    const mockParams = {
      chatId: "chat-456",
      sessionId: "session-123",
      jobToken: "token-abc",
      ctx: {
        deployerJobResource: "deployer-resource-123",
      },
    } as any;

    await runDeployerJob(mockParams, mockLogger);

    expect(jobsClient.runJob).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "deployer-resource-123",
        executionSuffix: "chat-456",
      })
    );
  });
});
