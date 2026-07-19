import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { CoreModule } from '../core/core.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { PubsubController } from './pubsub.controller.js';
import { PubsubService } from './pubsub.service.js';
import { PubsubAuthGuard } from '../common/guards/pubsub-auth.guard.js';

@Module({
  imports: [ConfigModule, CoreModule, JobsModule],
  controllers: [PubsubController],
  providers: [
    PubsubService,
    PubsubAuthGuard,
    {
      provide: OAuth2Client,
      useValue: new OAuth2Client(),
    },
  ],
  exports: [PubsubService, PubsubAuthGuard, OAuth2Client],
})
export class PubsubModule {}
