import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { JsonFileStore } from '../storage/json-file.store';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PatchTaskDto } from './dto/patch-task.dto';

export interface Task {
  id: number;
  descricao: string;
  inicio: number;
  fim: number;
  status: string;
  resultado: number[] | null;
}

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly store = new JsonFileStore<Task>('tasks.json');

  onModuleInit(): Promise<void> {
    return this.store.initialize();
  }

  findAll(): Promise<Task[]> {
    return this.store.findAll();
  }

  async findOne(id: number): Promise<Task> {
    const task = (await this.store.findAll()).find((item) => item.id === id);
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    return task;
  }

  create(dto: CreateTaskDto): Promise<Task> {
    return this.store.mutate((tasks) => {
      const task: Task = {
        id: this.store.nextId(tasks),
        descricao: dto.descricao,
        inicio: dto.inicio,
        fim: dto.fim,
        status: 'PENDENTE',
        resultado: null,
      };
      tasks.push(task);
      return task;
    });
  }

  update(id: number, dto: UpdateTaskDto): Promise<Task> {
    return this.store.mutate((tasks) => {
      const index = this.findIndex(tasks, id);
      tasks[index] = {
        id,
        descricao: dto.descricao,
        inicio: dto.inicio,
        fim: dto.fim,
        status: dto.status,
        resultado: dto.resultado,
      };
      return tasks[index];
    });
  }

  patch(id: number, dto: PatchTaskDto): Promise<Task> {
    return this.store.mutate((tasks) => {
      const task = tasks[this.findIndex(tasks, id)];
      if (dto.descricao !== undefined) task.descricao = dto.descricao;
      if (dto.inicio !== undefined) task.inicio = dto.inicio;
      if (dto.fim !== undefined) task.fim = dto.fim;
      if (dto.status !== undefined) task.status = dto.status;
      if (dto.resultado !== undefined) task.resultado = dto.resultado;
      return task;
    });
  }

  remove(id: number): Promise<void> {
    return this.store.mutate((tasks) => {
      tasks.splice(this.findIndex(tasks, id), 1);
    });
  }

  private findIndex(tasks: Task[], id: number): number {
    const index = tasks.findIndex((item) => item.id === id);
    if (index === -1) throw new NotFoundException('Tarefa não encontrada');
    return index;
  }
}
