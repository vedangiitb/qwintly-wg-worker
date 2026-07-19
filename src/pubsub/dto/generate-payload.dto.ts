import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ProjectRequestType } from '../../common/types/request.types.js';
import { BaseJobPayloadDto } from './base-job-payload.dto.js';

export class GeneratePayloadDto extends BaseJobPayloadDto {
  @IsEnum(ProjectRequestType)
  @IsNotEmpty()
  requestType!: ProjectRequestType;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  prevSessionId?: string;
}
