import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReplaceProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @IsString()
  @MaxLength(2000)
  descricao: string;

  @IsBoolean()
  ativo: boolean;
}
