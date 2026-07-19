import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { QwintlyCoreService } from '../core/qwintly-core.service.js';
import { StatusService } from '../core/status.service.js';
import { BuilderJobService } from '../jobs/builder-job.service.js';
import { DeployerJobService } from '../jobs/deployer-job.service.js';
import { GeneratePayloadDto } from './dto/generate-payload.dto.js';
import { DeployPayloadDto } from './dto/deploy-payload.dto.js';
import { JobParams } from '../common/types/job-params.types.js';

@Injectable()
export class PubsubService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(QwintlyCoreService) private readonly qwintlyCoreService: QwintlyCoreService,
    @Inject(StatusService) private readonly statusService: StatusService,
    @Inject(BuilderJobService) private readonly builderJobService: BuilderJobService,
    @Inject(DeployerJobService) private readonly deployerJobService: DeployerJobService,
  ) {}

  async verifyAndValidatePayload<T extends object>(
    rawPayload: string,
    dtoClass: new () => T,
  ): Promise<T> {
    let parsed: any;
    try {
      parsed = JSON.parse(rawPayload);
    } catch {
      throw new Error("Invalid JSON format");
    }

    const jobToken = parsed?.jobToken;
    if (!jobToken || typeof jobToken !== 'string' || !jobToken.trim()) {
      throw new Error("Missing jobToken");
    }

    const publishSecret = this.configService.get<string>('publishSecret');
    if (!publishSecret) {
      throw new Error("PUBLISH_SECRET config is not set");
    }

    const decoded = jwt.verify(jobToken, publishSecret) as Record<string, unknown>;
    
    const dtoInstance = plainToInstance(dtoClass, {
      ...decoded,
      jobToken,
    });

    try {
      await validateOrReject(dtoInstance, { skipMissingProperties: false });
    } catch (error_) {
      throw new Error("Validation failed: " + JSON.stringify(error_));
    }

    return dtoInstance;
  }

  async processGenerateJob(payload: GeneratePayloadDto, core: any): Promise<void> {
    const jobParams: JobParams = {
      core,
      chatId: payload.chatId,
      sessionId: payload.sessionId,
      jobToken: payload.jobToken,
    };

    await this.builderJobService.runBuilderJob(jobParams, core.streamLog.bind(core));
  }

  async processDeployJob(payload: DeployPayloadDto, core: any): Promise<void> {
    const jobParams: JobParams = {
      core,
      chatId: payload.chatId,
      sessionId: payload.sessionId,
      jobToken: payload.jobToken,
    };

    await this.deployerJobService.runDeployerJob(jobParams, core.streamLog.bind(core));
  }

  async finishDeploymentSession(sessionId: string, success: boolean): Promise<void> {
    await this.statusService.finishSession(
      sessionId,
      success,
      (supabase, genId, succ) => supabase.rpc("finish_deployment", {
        p_gen_id: genId,
        p_success: succ,
      })
    );
  }
}
