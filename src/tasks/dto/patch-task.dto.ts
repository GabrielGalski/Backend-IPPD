import { PartialType } from '@nestjs/mapped-types';
import { UpdateTaskDto } from './update-task.dto';

export class PatchTaskDto extends PartialType(UpdateTaskDto, {
  skipNullProperties: false,
}) {}
