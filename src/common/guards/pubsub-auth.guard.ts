import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { Request } from 'express';

@Injectable()
export class PubsubAuthGuard implements CanActivate {
  constructor(
    @Inject(OAuth2Client) private readonly authClient: OAuth2Client,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    const audienceBase = this.configService.get<string>('gcp.pubsubPushAudience');
    if (!audienceBase) {
      throw new Error("PUBSUB_PUSH_AUDIENCE not set");
    }

    const path = request.path;
    const audience = audienceBase + path;

    const authHeader = request.headers.authorization ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    if (!idToken) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      await this.authClient.verifyIdToken({ idToken, audience });
      return true;
    } catch (err) {
      throw new UnauthorizedException(`Invalid ID token: ${(err as Error).message}`);
    }
  }
}
