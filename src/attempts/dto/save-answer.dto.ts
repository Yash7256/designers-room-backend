import { IsObject } from 'class-validator';

export class SaveAnswerDto {
  @IsObject()
  answer: any;
}
