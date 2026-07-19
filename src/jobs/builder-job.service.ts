import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVENT_TYPES, EventType } from '@vedangiitb/qwintly-core';
import { JobParams } from '../common/types/job-params.types.js';
import { JobsService } from './jobs.service.js';

@Injectable()
export class BuilderJobService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(JobsService) private readonly jobsService: JobsService,
  ) {}

  async runBuilderJob(
    params: JobParams,
    logger: (message: string, eventType: EventType) => Promise<void>,
  ): Promise<void> {
    const projectId = this.configService.get<string>('gcp.projectId');
    const region = this.configService.get<string>('gcp.region');
    const jobName = this.configService.get<string>('gcp.builderJobName');
    const jobResource = `projects/${projectId}/locations/${region}/jobs/${jobName}`;

    await this.jobsService.runCloudRunJob({
      params,
      jobResource,
      pipelineLabel: 'builder',
      messages: {
        starting: 'Starting Generation',
        started: 'Generation started',
        failedPrefix: 'Generation Failed',
      },
      eventTypes: {
        STEP_STARTED: EVENT_TYPES.STEP_STARTED,
        GENERATION_FAILED: EVENT_TYPES.GENERATION_FAILED,
      },
      logger,
    });
  }
}
