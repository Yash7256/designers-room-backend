import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { TOPIC_STATUSES, type TopicStatus } from '../guidebook.types.js';

export class SetProgressDto {
  @ApiProperty({ enum: TOPIC_STATUSES })
  @IsIn(TOPIC_STATUSES)
  status!: TopicStatus;
}
