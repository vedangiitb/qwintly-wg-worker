import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service.js';

@Injectable()
export class StatusService {
  constructor(@Inject(SupabaseService) private readonly supabaseService: SupabaseService) {}

  private assertNonEmpty(value: string, field: string): void {
    if (!value?.trim()) {
      throw new Error(`\`${field}\` must be a non-empty string`);
    }
  }

  async finishSession(
    genId: string,
    success: boolean,
    rpc: (supabase: SupabaseClient, genId: string, success: boolean) => any,
  ): Promise<void> {
    this.assertNonEmpty(genId, 'genId');

    const supabase = this.supabaseService.getClient();
    const { error } = await rpc(supabase, genId, success);

    if (error) {
      throw new Error(`Failed to finish generation session: ${error.message}`);
    }
  }
}
