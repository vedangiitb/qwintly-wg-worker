import { Test, TestingModule } from '@nestjs/testing';
import { JobsClient } from '@google-cloud/run';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../src/jobs/jobs.service.js';
import { BuilderJobService } from '../src/jobs/builder-job.service.js';
import { DeployerJobService } from '../src/jobs/deployer-job.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('JobsModule Services', () => {
  let jobsService: JobsService;
  let builderJobService: BuilderJobService;
  let deployerJobService: DeployerJobService;
  let mockJobsClient: { runJob: any };
  let mockConfigService: any;

  const mockParams = {
    sessionId: 'session-123',
    jobToken: 'token-abc',
    chatId: 'chat-456',
  } as any;

  const mockLogger = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();

    mockJobsClient = {
      runJob: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'gcp.projectId') return 'mock-project';
        if (key === 'gcp.region') return 'asia-south1';
        if (key === 'gcp.builderJobName') return 'qwintly-builder';
        if (key === 'gcp.deployerJobName') return 'qwintly-deployer';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        BuilderJobService,
        DeployerJobService,
        {
          provide: JobsClient,
          useValue: mockJobsClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    jobsService = module.get<JobsService>(JobsService);
    builderJobService = module.get<BuilderJobService>(BuilderJobService);
    deployerJobService = module.get<DeployerJobService>(DeployerJobService);
  });

  describe('runCloudRunJob', () => {
    it('should successfully run Cloud Run job and log progress', async () => {
      mockJobsClient.runJob.mockResolvedValue({} as any);

      const options = {
        params: mockParams,
        jobResource: 'my-job-resource',
        executionSuffix: 'suffix',
        pipelineLabel: 'label',
        messages: {
          starting: 'starting-msg',
          started: 'started-msg',
          failedPrefix: 'failed-msg',
        },
        eventTypes: {
          STEP_STARTED: 'step_started',
          GENERATION_FAILED: 'generation_failed',
        },
        logger: mockLogger,
      };

      await expect(jobsService.runCloudRunJob(options)).resolves.toBeUndefined();

      expect(mockLogger).toHaveBeenCalledWith('starting-msg', 'step_started');
      expect(mockJobsClient.runJob).toHaveBeenCalledWith({
        name: 'my-job-resource',
        executionSuffix: 'suffix',
        overrides: {
          labels: { pipeline: 'label' },
          containerOverrides: [
            {
              env: [
                { name: 'SESSION_ID', value: 'session-123' },
                { name: 'JOB_TOKEN', value: 'token-abc' },
              ],
            },
          ],
        },
      });
      expect(mockLogger).toHaveBeenCalledWith('started-msg', 'step_started');
    });

    it('should log failure and rethrow if jobsClient.runJob throws error', async () => {
      const error = new Error('GCP connection error');
      mockJobsClient.runJob.mockRejectedValue(error);

      const options = {
        params: mockParams,
        jobResource: 'my-job-resource',
        messages: {
          starting: 'starting-msg',
          started: 'started-msg',
          failedPrefix: 'failed-msg',
        },
        eventTypes: {
          STEP_STARTED: 'step_started',
          GENERATION_FAILED: 'generation_failed',
        },
        logger: mockLogger,
      };

      await expect(jobsService.runCloudRunJob(options)).rejects.toThrow('GCP connection error');

      expect(mockLogger).toHaveBeenCalledWith('starting-msg', 'step_started');
      expect(mockLogger).toHaveBeenCalledWith('failed-msg: GCP connection error', 'generation_failed');
    });
  });

  describe('runBuilderJob', () => {
    it('should delegate to runCloudRunJob correctly with builder resource', async () => {
      mockJobsClient.runJob.mockResolvedValue({} as any);

      await builderJobService.runBuilderJob(mockParams, mockLogger);

      expect(mockJobsClient.runJob).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'projects/mock-project/locations/asia-south1/jobs/qwintly-builder',
          overrides: expect.objectContaining({
            labels: { pipeline: 'builder' },
          }),
        })
      );
    });
  });

  describe('runDeployerJob', () => {
    it('should delegate to runCloudRunJob correctly with deployer resource', async () => {
      mockJobsClient.runJob.mockResolvedValue({} as any);

      await deployerJobService.runDeployerJob(mockParams, mockLogger);

      expect(mockJobsClient.runJob).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'projects/mock-project/locations/asia-south1/jobs/qwintly-deployer',
          executionSuffix: 'chat-456',
        })
      );
    });
  });
});
