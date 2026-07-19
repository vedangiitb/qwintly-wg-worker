import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('supabase.url');
    const secretKey = this.configService.get<string>('supabase.secretKey');
    if (!url || !secretKey) {
      throw new Error('Supabase URL or Secret Key is not configured');
    }
    this.client = createClient(url, secretKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
