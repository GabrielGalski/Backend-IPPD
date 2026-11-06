import { CreateTaskDto } from './create-task.dto';
import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateTaskDto extends CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  status: string;

  @ValidateIf((_object, value: unknown) => value !== null)
  @IsDefined()
  @IsArray()
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  resultado: number[] | null;
}
