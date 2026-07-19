import { Controller, Get, Post, Req, Res, UseGuards, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { QwintlyCoreService } from '../core/qwintly-core.service.js';
import { PubsubService } from './pubsub.service.js';
import { PubsubAuthGuard } from '../common/guards/pubsub-auth.guard.js';
import { decodePubsubMessageData } from '../common/utils/pubsub.utils.js';
import { GeneratePayloadDto } from './dto/generate-payload.dto.js';
import { DeployPayloadDto } from './dto/deploy-payload.dto.js';
import { GEN_STEPS, EVENT_TYPES } from '../common/types/events.js';

@Controller()
export class PubsubController {
  constructor(
    @Inject(PubsubService) private readonly pubsubService: PubsubService,
    @Inject(QwintlyCoreService) private readonly qwintlyCoreService: QwintlyCoreService,
  ) {}

  @Get('/')
  getHome(@Res() res: Response) {
    return res.status(200).send('ok');
  }

  @Get('/healthz')
  getHealth(@Res() res: Response) {
    return res.status(200).send('ok');
  }

  @Post('/pubsub/generate')
  @UseGuards(PubsubAuthGuard)
  async handleGenerate(@Req() req: Request, @Res() res: Response) {
    let core: any;
    let decoded: string;
    let payload: GeneratePayloadDto;

    try {
      decoded = decodePubsubMessageData(req);
      payload = await this.pubsubService.verifyAndValidatePayload(decoded, GeneratePayloadDto);
    } catch (err) {
      console.error('Pub/Sub handling error', err);
      return res.status(204).send('Invalid payload');
    }

    try {
      core = this.qwintlyCoreService.getQwintlyCore({
        chatId: payload.chatId,
        sessionId: payload.sessionId,
        workspace: 'test',
        step: GEN_STEPS.INITIATING,
      });
    } catch (error) {
      console.error('Pub/Sub handling error', error);
      return res.status(500).send('Failed to start session');
    }

    try {
      await this.pubsubService.processGenerateJob(payload, core);
      return res.status(204).send();
    } catch (err) {
      await core.streamLog(
        'Failed to start job',
        EVENT_TYPES.GENERATION_FAILED,
      );
      console.error('Pub/Sub handling error', err);
      await this.pubsubService.finishDeploymentSession(payload.sessionId, false);
      return res.status(204).send();
    }
  }

  @Post('/pubsub/deploy')
  @UseGuards(PubsubAuthGuard)
  async handleDeploy(@Req() req: Request, @Res() res: Response) {
    let core: any;
    let decoded: string;
    let payload: DeployPayloadDto;

    try {
      decoded = decodePubsubMessageData(req);
      payload = await this.pubsubService.verifyAndValidatePayload(decoded, DeployPayloadDto);
    } catch (err) {
      console.error('Pub/Sub handling error', err);
      return res.status(204).send('Invalid payload');
    }

    try {
      core = this.qwintlyCoreService.getQwintlyCore({
        chatId: payload.chatId,
        sessionId: payload.sessionId,
        workspace: 'test',
        step: GEN_STEPS.INITIATING,
      });
    } catch (error) {
      console.error('Pub/Sub handling error', error);
      return res.status(500).send('Failed to start session');
    }

    try {
      await this.pubsubService.processDeployJob(payload, core);
      return res.status(204).send();
    } catch (err) {
      await core.streamLog(
        'Failed to start job',
        EVENT_TYPES.GENERATION_FAILED,
      );
      console.error('Pub/Sub handling error', err);
      await this.pubsubService.finishDeploymentSession(payload.sessionId, false);
      return res.status(204).send();
    }
  }
}
