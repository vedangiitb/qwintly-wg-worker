import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { CoreModule } from './core/core.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { PubsubModule } from './pubsub/pubsub.module.js';

@Module({
  imports: [ConfigModule, CoreModule, JobsModule, PubsubModule],
})
export class AppModule {}
