import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVENT_TYPES, EventType } from '../common/types/events.js';
import { JobParams } from '../common/types/job-params.types.js';
import { JobsService } from './jobs.service.js';

@Injectable()
export class DeployerJobService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(JobsService) private readonly jobsService: JobsService,
  ) {}

  async runDeployerJob(
    params: JobParams,
    logger: (message: string, eventType: EventType) => Promise<void>,
  ): Promise<void> {
    const projectId = this.configService.get<string>('gcp.projectId');
    const region = this.configService.get<string>('gcp.region');
    const jobName = this.configService.get<string>('gcp.deployerJobName');
    const jobResource = `projects/${projectId}/locations/${region}/jobs/${jobName}`;

    await this.jobsService.runCloudRunJob({
      params,
      jobResource,
      executionSuffix: params.chatId,
      messages: {
        starting: 'Starting Deploying application',
        started: 'Deployment Started',
        failedPrefix: 'Failed Deploying application',
      },
      eventTypes: {
        STEP_STARTED: EVENT_TYPES.STEP_STARTED,
        GENERATION_FAILED: EVENT_TYPES.GENERATION_FAILED,
      },
      logger,
    });
  }
}
