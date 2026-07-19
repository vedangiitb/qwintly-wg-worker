import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsClient } from '@google-cloud/run';
import { JobsService } from './jobs.service.js';
import { BuilderJobService } from './builder-job.service.js';
import { DeployerJobService } from './deployer-job.service.js';

@Module({
  imports: [ConfigModule],
  providers: [
    JobsService,
    BuilderJobService,
    DeployerJobService,
    {
      provide: JobsClient,
      useFactory: (configService: ConfigService) => {
        const projectId = configService.get<string>('gcp.projectId');
        return new JobsClient({ projectId });
      },
      inject: [ConfigService],
    },
  ],
  exports: [JobsService, BuilderJobService, DeployerJobService, JobsClient],
})
export class JobsModule {}
