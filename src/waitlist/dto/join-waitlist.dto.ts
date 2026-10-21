import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinWaitlistDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ description: 'Origin of the signup', default: 'waitlist-page' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string = 'waitlist-page';
}
