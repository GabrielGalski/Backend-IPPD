import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { JsonFileStore } from '../storage/json-file.store';
import { CreateProjectDto } from './dto/create-project.dto';
import { ReplaceProjectDto } from './dto/replace-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

export interface Project {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
}

@Injectable()
export class ProjectsService implements OnModuleInit {
  private readonly store = new JsonFileStore<Project>('projects.json');

  onModuleInit(): Promise<void> {
    return this.store.initialize();
  }

  findAll(): Promise<Project[]> {
    return this.store.findAll();
  }

  async findOne(id: number): Promise<Project> {
    const project = (await this.store.findAll()).find((item) => item.id === id);
    if (!project) throw new NotFoundException('Projeto não encontrado');
    return project;
  }

  create(dto: CreateProjectDto): Promise<Project> {
    return this.store.mutate((projects) => {
      const project: Project = {
        id: this.store.nextId(projects),
        nome: dto.nome,
        descricao: dto.descricao ?? '',
        ativo: dto.ativo ?? true,
      };
      projects.push(project);
      return project;
    });
  }

  replace(id: number, dto: ReplaceProjectDto): Promise<Project> {
    return this.store.mutate((projects) => {
      const index = this.findIndex(projects, id);
      projects[index] = {
        id,
        nome: dto.nome,
        descricao: dto.descricao,
        ativo: dto.ativo,
      };
      return projects[index];
    });
  }

  patch(id: number, dto: UpdateProjectDto): Promise<Project> {
    return this.store.mutate((projects) => {
      const project = projects[this.findIndex(projects, id)];
      if (dto.nome !== undefined) project.nome = dto.nome;
      if (dto.descricao !== undefined) project.descricao = dto.descricao;
      if (dto.ativo !== undefined) project.ativo = dto.ativo;
      return project;
    });
  }

  remove(id: number): Promise<void> {
    return this.store.mutate((projects) => {
      projects.splice(this.findIndex(projects, id), 1);
    });
  }

  private findIndex(projects: Project[], id: number): number {
    const index = projects.findIndex((item) => item.id === id);
    if (index === -1) throw new NotFoundException('Projeto não encontrado');
    return index;
  }
}
