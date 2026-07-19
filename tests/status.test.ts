import { Test, TestingModule } from '@nestjs/testing';
import { StatusService } from '../src/core/status.service.js';
import { SupabaseService } from '../src/core/supabase.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('StatusService', () => {
  let service: StatusService;
  let mockSupabaseService: any;
  const mockClient = { rpc: vi.fn() };

  beforeEach(async () => {
    mockSupabaseService = {
      getClient: vi.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<StatusService>(StatusService);
  });

  it('should successfully finish a session', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    await expect(service.finishSession('gen-123', true, mockRpc)).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith(mockClient, 'gen-123', true);
  });

  it('should throw error if genId is empty or whitespace', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    await expect(service.finishSession('   ', true, mockRpc)).rejects.toThrow('`genId` must be a non-empty string');
    await expect(service.finishSession('', true, mockRpc)).rejects.toThrow('`genId` must be a non-empty string');
  });

  it('should throw an error if the RPC call returns an error', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: { message: 'DB Error' } });
    await expect(service.finishSession('gen-123', false, mockRpc)).rejects.toThrow(
      'Failed to finish generation session: DB Error'
    );
  });
});
