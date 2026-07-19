import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QwintlyCore } from '@vedangiitb/qwintly-core';

export interface GenCtx {
  chatId: string;
  sessionId: string;
  workspace: string;
  step: string;
}

@Injectable()
export class QwintlyCoreService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getQwintlyCore(ctx: GenCtx): QwintlyCore {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseSecret = this.configService.get<string>('supabase.secretKey');
    const upstashUrl = this.configService.get<string>('upstash.url');
    const upstashToken = this.configService.get<string>('upstash.token');

    if (!supabaseUrl || !supabaseSecret || !upstashUrl || !upstashToken) {
      throw new Error('Supabase or Upstash credentials are not fully configured');
    }

    return new QwintlyCore({
      chatId: ctx.chatId,
      sessionId: ctx.sessionId,
      workspacePath: ctx.workspace,
      source: 'qwintly-wg-worker',
      step: ctx.step,
      supabase: {
        endpoint: supabaseUrl,
        secret: supabaseSecret,
      },
      upstash: {
        url: upstashUrl,
        token: upstashToken,
      },
    });
  }
}
