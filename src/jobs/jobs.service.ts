import { Injectable, Inject } from '@nestjs/common';
import { JobsClient } from '@google-cloud/run';
import { JobParams } from '../common/types/job-params.types.js';

export interface RunCloudRunJobOptions<EventType> {
  params: JobParams;
  jobResource: string;
  executionSuffix?: string;
  pipelineLabel?: string;
  messages: {
    starting: string;
    started: string;
    failedPrefix: string;
  };
  eventTypes: {
    STEP_STARTED: EventType;
    GENERATION_FAILED: EventType;
  };
  logger: (message: string, eventType: EventType) => Promise<void>;
}

@Injectable()
export class JobsService {
  constructor(@Inject(JobsClient) private readonly jobsClient: JobsClient) {}

  private buildSessionEnv(params: JobParams) {
    const jobParams = {
      SESSION_ID: params.sessionId,
      JOB_TOKEN: params.jobToken,
    };

    return Object.entries(jobParams).map(([name, value]) => ({
      name,
      value: String(value),
    }));
  }

  async runCloudRunJob<EventType>(options: RunCloudRunJobOptions<EventType>): Promise<void> {
    const {
      params,
      jobResource,
      executionSuffix,
      pipelineLabel,
      messages,
      eventTypes,
      logger,
    } = options;

    try {
      const request = {
        name: jobResource,
        ...(executionSuffix ? { executionSuffix } : {}),
        overrides: {
          ...(pipelineLabel ? { labels: { pipeline: pipelineLabel } } : {}),
          containerOverrides: [
            {
              env: this.buildSessionEnv(params),
            },
          ],
        },
      };

      await logger(messages.starting, eventTypes.STEP_STARTED);
      await this.jobsClient.runJob(request);
      await logger(messages.started, eventTypes.STEP_STARTED);
    } catch (err) {
      await logger(
        `${messages.failedPrefix}: ${(err as Error).message}`,
        eventTypes.GENERATION_FAILED,
      );
      throw err;
    }
  }
}
