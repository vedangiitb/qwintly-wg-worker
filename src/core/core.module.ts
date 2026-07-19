import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './supabase.service.js';
import { QwintlyCoreService } from './qwintly-core.service.js';
import { StatusService } from './status.service.js';

@Module({
  imports: [ConfigModule],
  providers: [SupabaseService, QwintlyCoreService, StatusService],
  exports: [SupabaseService, QwintlyCoreService, StatusService],
})
export class CoreModule {}
