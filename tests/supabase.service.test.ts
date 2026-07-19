import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../src/core/supabase.service.js';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as supabaseJs from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      rpc: vi.fn(),
    })),
  };
});

describe('SupabaseService', () => {
  let service: SupabaseService;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and return the supabase client', async () => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'supabase.url') return 'https://mock-supabase.co';
        if (key === 'supabase.secretKey') return 'mock-secret-key';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    service.onModuleInit();

    expect(supabaseJs.createClient).toHaveBeenCalledWith(
      'https://mock-supabase.co',
      'mock-secret-key'
    );
    expect(service.getClient()).toBeDefined();
  });

  it('should throw an error during initialization if configuration is missing', async () => {
    mockConfigService = {
      get: vi.fn(() => null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    expect(() => service.onModuleInit()).toThrow('Supabase URL or Secret Key is not configured');
  });
});
