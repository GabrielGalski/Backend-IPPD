import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descricao: string;

  @IsInt()
  inicio: number;

  @IsInt()
  fim: number;
}
