import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';

export class PubsubMessageDto {
  @IsString()
  @IsNotEmpty()
  data!: string;
}

export class PubsubEnvelopeDto {
  @IsObject()
  @ValidateNested()
  @Type(() => PubsubMessageDto)
  message!: PubsubMessageDto;
}
