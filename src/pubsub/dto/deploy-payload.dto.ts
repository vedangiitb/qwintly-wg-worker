import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseJobPayloadDto } from './base-job-payload.dto.js';

export class DeployPayloadDto extends BaseJobPayloadDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  snapshotId!: string;
}
