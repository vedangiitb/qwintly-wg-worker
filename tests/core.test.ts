import { Test, TestingModule } from '@nestjs/testing';
import { QwintlyCoreService } from '../src/core/qwintly-core.service.js';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('QwintlyCoreService', () => {
  let service: QwintlyCoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QwintlyCoreService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'supabase.url') return 'https://mock-supabase.co';
              if (key === 'supabase.secretKey') return 'mock-secret-key';
              if (key === 'upstash.url') return 'https://mock-redis.co';
              if (key === 'upstash.token') return 'mock-token';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QwintlyCoreService>(QwintlyCoreService);
  });

  it('should construct QwintlyCore with environment config parameters', () => {
    const ctx = {
      chatId: 'chat-123',
      sessionId: 'sess-456',
      workspace: 'work-path',
      step: 'initiating',
    };

    const coreInstance = service.getQwintlyCore(ctx);

    const constructorSpy = (globalThis as any).mockQwintlyCoreConstructor;
    expect(constructorSpy).toHaveBeenCalledWith({
      chatId: 'chat-123',
      sessionId: 'sess-456',
      workspacePath: 'work-path',
      source: 'qwintly-wg-worker',
      step: 'initiating',
      supabase: {
        endpoint: 'https://mock-supabase.co',
        secret: 'mock-secret-key',
      },
      upstash: {
        url: 'https://mock-redis.co',
        token: 'mock-token',
      },
    });

    expect(coreInstance).toBeDefined();
  });
});
