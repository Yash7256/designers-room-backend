import { IsOptional, IsString } from 'class-validator';

export class GetChallengesQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
