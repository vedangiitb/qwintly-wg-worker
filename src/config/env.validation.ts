import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Production;

  @IsNumber()
  @IsOptional()
  PORT: number = 8080;

  @IsString()
  GCP_PROJECT_ID_QWINTLY!: string;

  @IsString()
  @IsOptional()
  REGION: string = 'asia-south1';

  @IsUrl({ require_tld: false })
  NEXT_PUBLIC_SUPABASE_URL!: string;

  @IsString()
  SUPABASE_SECRET_KEY!: string;

  @IsUrl({ require_tld: false })
  UPSTASH_REDIS_REST_URL_GEN_EVENTS!: string;

  @IsString()
  UPSTASH_REDIS_REST_TOKEN_GEN_EVENTS!: string;

  @IsString()
  PUBSUB_PUSH_AUDIENCE!: string;

  @IsString()
  PUBLISH_SECRET!: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true }
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
