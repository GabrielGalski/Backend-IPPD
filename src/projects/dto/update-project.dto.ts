import { PartialType } from '@nestjs/mapped-types';
import { ReplaceProjectDto } from './replace-project.dto';

export class UpdateProjectDto extends PartialType(ReplaceProjectDto, {
  skipNullProperties: false,
}) {}
