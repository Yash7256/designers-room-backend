import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class GuidebookTopicPositionDto {
  @ApiProperty()
  @IsString()
  @Length(1, 64)
  id!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderGuidebookTopicsDto {
  @ApiProperty({ type: [GuidebookTopicPositionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuidebookTopicPositionDto)
  items!: GuidebookTopicPositionDto[];
}
