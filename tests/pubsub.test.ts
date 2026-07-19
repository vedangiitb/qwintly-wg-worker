import { Test, TestingModule } from '@nestjs/testing';
import jwt from 'jsonwebtoken';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PubsubService } from '../src/pubsub/pubsub.service.js';
import { PubsubController } from '../src/pubsub/pubsub.controller.js';
import { PubsubAuthGuard } from '../src/common/guards/pubsub-auth.guard.js';
import { QwintlyCoreService } from '../src/core/qwintly-core.service.js';
import { StatusService } from '../src/core/status.service.js';
import { BuilderJobService } from '../src/jobs/builder-job.service.js';
import { DeployerJobService } from '../src/jobs/deployer-job.service.js';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { GeneratePayloadDto } from '../src/pubsub/dto/generate-payload.dto.js';
import { DeployPayloadDto } from '../src/pubsub/dto/deploy-payload.dto.js';
import * as decodeUtils from '../src/common/utils/pubsub.utils.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

vi.mock('jsonwebtoken', () => {
  return {
    default: {
      verify: vi.fn(),
    },
  };
});

describe('GeneratePayloadDto Validation', () => {
  it('should validate and normalize a valid generate payload DTO', async () => {
    const raw = {
      chatId: ' chat-1 ',
      planId: ' plan-2 ',
      userId: ' user-3 ',
      requestType: 'new',
      provider: 'openai',
      model: 'gpt-4',
      prevSessionId: ' prev-4 ',
      sessionId: ' sess-5 ',
      jobToken: 'mock-token',
      byokEnabled: 'true',
    };

    const dto = plainToInstance(GeneratePayloadDto, raw);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.chatId).toBe('chat-1');
    expect(dto.planId).toBe('plan-2');
    expect(dto.userId).toBe('user-3');
    expect(dto.requestType).toBe('new');
    expect(dto.provider).toBe('openai');
    expect(dto.model).toBe('gpt-4');
    expect(dto.prevSessionId).toBe('prev-4');
    expect(dto.sessionId).toBe('sess-5');
    expect(dto.byokEnabled).toBe(true);
  });

  it('should validate a valid deployer payload DTO', async () => {
    const raw = {
      chatId: 'chat-1',
      planId: 'plan-2',
      userId: 'user-3',
      model: 'gpt-4',
      provider: 'openai',
      sessionId: 'sess-5',
      snapshotId: 'snap-6',
      jobToken: 'mock-token',
      byokEnabled: false,
    };

    const dto = plainToInstance(DeployPayloadDto, raw);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.chatId).toBe('chat-1');
    expect(dto.planId).toBe('plan-2');
    expect(dto.userId).toBe('user-3');
    expect(dto.model).toBe('gpt-4');
    expect(dto.provider).toBe('openai');
    expect(dto.sessionId).toBe('sess-5');
    expect(dto.snapshotId).toBe('snap-6');
    expect(dto.byokEnabled).toBe(false);
  });

  it('should throw for invalid byokEnabled string values', () => {
    const raw = {
      chatId: 'chat-1',
      planId: 'plan-2',
      userId: 'user-3',
      requestType: 'new',
      provider: 'openai',
      model: 'gpt-4',
      sessionId: 'sess-5',
      jobToken: 'mock-token',
      byokEnabled: 'invalid-boolean',
    };

    expect(() => plainToInstance(GeneratePayloadDto, raw).byokEnabled).toThrow('Invalid byokEnabled value');
  });
});

describe('PubsubService verifyAndValidatePayload', () => {
  let service: PubsubService;
  let mockConfigService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'publishSecret') return 'mock-publish-secret';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubsubService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        { provide: QwintlyCoreService, useValue: {} },
        { provide: StatusService, useValue: {} },
        { provide: BuilderJobService, useValue: {} },
        { provide: DeployerJobService, useValue: {} },
      ],
    }).compile();

    service = module.get<PubsubService>(PubsubService);
  });

  it('should validate and return payload from token', async () => {
    (vi.mocked(jwt.verify) as any).mockReturnValue({
      chatId: 'chat-123',
      planId: 'plan-456',
      userId: 'user-789',
      requestType: 'new',
      provider: 'openai',
      model: 'gpt-4',
      sessionId: 'sess-999',
      byokEnabled: true,
    });

    const rawPayload = JSON.stringify({ jobToken: 'mock-token' });
    const result = await service.verifyAndValidatePayload(rawPayload, GeneratePayloadDto);

    expect(result.chatId).toBe('chat-123');
    expect(jwt.verify).toHaveBeenCalledWith('mock-token', 'mock-publish-secret');
  });

  it('should throw if raw payload is invalid JSON', async () => {
    await expect(service.verifyAndValidatePayload('invalid-json', GeneratePayloadDto)).rejects.toThrow('Invalid JSON format');
  });

  it('should throw if jobToken is missing', async () => {
    await expect(service.verifyAndValidatePayload(JSON.stringify({}), GeneratePayloadDto)).rejects.toThrow('Missing jobToken');
  });
});

describe('PubsubAuthGuard', () => {
  let guard: PubsubAuthGuard;
  let mockAuthClient: { verifyIdToken: any };
  let mockConfigService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthClient = { verifyIdToken: vi.fn() };
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'gcp.pubsubPushAudience') return 'https://mock-audience.co';
        return null;
      }),
    };

    guard = new PubsubAuthGuard(mockAuthClient as any, mockConfigService);
  });

  it('should throw error if audience is missing', async () => {
    mockConfigService.get.mockReturnValue(undefined);
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/pubsub/generate',
          headers: { authorization: 'Bearer token' },
        }),
      }),
    } as any;

    await expect(guard.canActivate(mockContext)).rejects.toThrow('PUBSUB_PUSH_AUDIENCE not set');
  });

  it('should throw error if token is missing Bearer prefix', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/pubsub/generate',
          headers: { authorization: 'Basic user:pass' },
        }),
      }),
    } as any;

    await expect(guard.canActivate(mockContext)).rejects.toThrow('Missing bearer token');
  });

  it('should verify token and return true if validation passes', async () => {
    mockAuthClient.verifyIdToken.mockResolvedValue({});
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/pubsub/generate',
          headers: { authorization: 'Bearer my-id-token' },
        }),
      }),
    } as any;

    const res = await guard.canActivate(mockContext);
    expect(res).toBe(true);
    expect(mockAuthClient.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'my-id-token',
      audience: 'https://mock-audience.co/pubsub/generate',
    });
  });
});

describe('PubsubController', () => {
  let controller: PubsubController;
  let mockPubsubService: any;
  let mockQwintlyCoreService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPubsubService = {
      verifyAndValidatePayload: vi.fn(),
      processGenerateJob: vi.fn(),
      finishDeploymentSession: vi.fn(),
    };

    mockQwintlyCoreService = {
      getQwintlyCore: vi.fn(),
    };

    controller = new PubsubController(mockPubsubService, mockQwintlyCoreService);
  });

  it('should return 204 if validation fails', async () => {
    mockPubsubService.verifyAndValidatePayload.mockRejectedValue(new Error('Validation Error'));
    vi.spyOn(decodeUtils, 'decodePubsubMessageData').mockReturnValue('dec-data');

    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockRes = { status: statusMock } as any;

    await controller.handleGenerate({} as any, mockRes);
    expect(statusMock).toHaveBeenCalledWith(204);
    expect(sendMock).toHaveBeenCalledWith('Invalid payload');
  });

  it('should return 500 if Qwintly Core construction fails', async () => {
    mockPubsubService.verifyAndValidatePayload.mockResolvedValue({});
    mockQwintlyCoreService.getQwintlyCore.mockImplementation(() => {
      throw new Error('Core Init Error');
    });
    vi.spyOn(decodeUtils, 'decodePubsubMessageData').mockReturnValue('dec-data');

    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const mockRes = { status: statusMock } as any;

    await controller.handleGenerate({} as any, mockRes);
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(sendMock).toHaveBeenCalledWith('Failed to start session');
  });

  it('should run job successfully and return 204', async () => {
    mockPubsubService.verifyAndValidatePayload.mockResolvedValue({ chatId: '1', sessionId: '2', jobToken: 'tok' });
    const mockStreamLog = vi.fn();
    mockQwintlyCoreService.getQwintlyCore.mockReturnValue({
      streamLog: mockStreamLog,
    });
    mockPubsubService.processGenerateJob.mockResolvedValue(undefined);
    vi.spyOn(decodeUtils, 'decodePubsubMessageData').mockReturnValue('dec-data');

    const sendMock = vi.fn();
    const mockRes = {
      status: vi.fn().mockReturnValue({ send: sendMock }),
    } as any;

    await controller.handleGenerate({} as any, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockPubsubService.processGenerateJob).toHaveBeenCalled();
  });
});
