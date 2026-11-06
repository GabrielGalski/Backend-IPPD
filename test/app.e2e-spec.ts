import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, sep } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

describe('Tasks and projects API (e2e)', () => {
  let app: INestApplication<App>;
  let directory: string;
  let previousDirectory: string | undefined;
  const testRoot = join(process.cwd(), 'test-results');

  beforeAll(async () => {
    await mkdir(testRoot, { recursive: true });
    directory = await mkdtemp(join(testRoot, 'nest-api-e2e-'));
    previousDirectory = process.env.DATA_DIR;
    process.env.DATA_DIR = directory;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app?.close();
    if (previousDirectory === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDirectory;
    if (!directory.startsWith(testRoot + sep))
      throw new Error('Diretório de teste inválido');
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  });

  it('preserves the original root endpoint', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('performs complete CRUD on projects and saves the resulting JSON', async () => {
    const created = await request(app.getHttpServer())
      .post('/projects')
      .send({ nome: 'Projeto e2e' })
      .expect(201);
    const id = created.body.id as number;
    expect(created.body).toEqual({
      id,
      nome: 'Projeto e2e',
      descricao: '',
      ativo: true,
    });
    const replacement = {
      nome: 'Substituído',
      descricao: 'Todos os campos',
      ativo: false,
    };
    await request(app.getHttpServer())
      .put(`/projects/${id}`)
      .send(replacement)
      .expect(200)
      .expect({ id, ...replacement });
    await request(app.getHttpServer())
      .patch(`/projects/${id}`)
      .send({ ativo: true })
      .expect(200)
      .expect({ id, ...replacement, ativo: true });
    await request(app.getHttpServer())
      .get(`/projects/${id}`)
      .expect(200)
      .expect({ id, ...replacement, ativo: true });
    expect(
      JSON.parse(await readFile(join(directory, 'projects.json'), 'utf8')),
    ).toContainEqual({ id, ...replacement, ativo: true });
    await request(app.getHttpServer())
      .delete(`/projects/${id}`)
      .expect(204)
      .expect('');
    await request(app.getHttpServer()).get(`/projects/${id}`).expect(404);
    await request(app.getHttpServer())
      .patch(`/projects/${id}`)
      .send({ ativo: false })
      .expect(404);
    await request(app.getHttpServer())
      .put(`/projects/${id}`)
      .send(replacement)
      .expect(404);
    await request(app.getHttpServer()).delete(`/projects/${id}`).expect(404);
    expect(
      JSON.parse(await readFile(join(directory, 'projects.json'), 'utf8')),
    ).toEqual([]);
  });

  it('performs complete CRUD on the existing tasks module', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .send({ descricao: 'Tarefa e2e', inicio: 1, fim: 10 })
      .expect(201);
    const id = created.body.id as number;
    expect(created.body).toEqual({
      id,
      descricao: 'Tarefa e2e',
      inicio: 1,
      fim: 10,
      status: 'PENDENTE',
      resultado: null,
    });
    const replacement = {
      descricao: 'Substituída',
      inicio: 2,
      fim: 20,
      status: 'EM_ANDAMENTO',
      resultado: [2, 4],
    };
    await request(app.getHttpServer())
      .put(`/tasks/${id}`)
      .send(replacement)
      .expect(200)
      .expect({ id, ...replacement });
    await request(app.getHttpServer())
      .patch(`/tasks/${id}`)
      .send({ status: 'CONCLUIDA', resultado: null })
      .expect(200)
      .expect({ id, ...replacement, status: 'CONCLUIDA', resultado: null });
    await request(app.getHttpServer()).get(`/tasks/${id}`).expect(200);
    expect(
      JSON.parse(await readFile(join(directory, 'tasks.json'), 'utf8')),
    ).toContainEqual({
      id,
      ...replacement,
      status: 'CONCLUIDA',
      resultado: null,
    });
    await request(app.getHttpServer())
      .delete(`/tasks/${id}`)
      .expect(204)
      .expect('');
    await request(app.getHttpServer()).get(`/tasks/${id}`).expect(404);
    await request(app.getHttpServer())
      .patch(`/tasks/${id}`)
      .send({ status: 'PENDENTE' })
      .expect(404);
    await request(app.getHttpServer())
      .put(`/tasks/${id}`)
      .send(replacement)
      .expect(404);
    await request(app.getHttpServer()).delete(`/tasks/${id}`).expect(404);
  });

  it.each([
    ['/projects', {}],
    ['/projects', { nome: '' }],
    ['/projects', { nome: 'Teste', ativo: 'true' }],
    ['/projects', { nome: 'Teste', ativo: null }],
    ['/projects', { nome: 'Teste', id: 999 }],
    ['/projects', { nome: 'Teste', descricao: null }],
    ['/tasks', { descricao: 'Teste', inicio: '1', fim: 2 }],
    ['/tasks', { descricao: 'Teste', inicio: 1.5, fim: 2 }],
    ['/tasks', { descricao: 'Teste', inicio: 1, fim: 2, status: 'CONCLUIDA' }],
  ])('rejects invalid POST %s: %j', async (path, body) => {
    await request(app.getHttpServer())
      .post(path as string)
      .send(body)
      .expect(400);
  });

  it.each(['/projects', '/tasks'])(
    'validates IDs and distinguishes PUT from PATCH on %s',
    async (path) => {
      await request(app.getHttpServer()).get(`${path}/abc`).expect(400);
      await request(app.getHttpServer()).put(`${path}/1`).send({}).expect(400);
      await request(app.getHttpServer())
        .patch(`${path}/1`)
        .send({ id: 2 })
        .expect(400);
      const field = path === '/projects' ? 'ativo' : 'descricao';
      await request(app.getHttpServer())
        .patch(`${path}/1`)
        .send({ [field]: null })
        .expect(400);
      const collection = await request(app.getHttpServer())
        .get(path)
        .expect(200);
      expect(collection.body).toEqual([]);
    },
  );

  it.each(['/projects', '/tasks'])(
    'keeps 20 concurrent POSTs in %s without lost updates',
    async (path) => {
      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          request(app.getHttpServer())
            .post(path)
            .send(
              path === '/projects'
                ? { nome: `Concorrente ${index}` }
                : {
                    descricao: `Concorrente ${index}`,
                    inicio: index,
                    fim: index + 1,
                  },
            )
            .expect(201),
        ),
      );
      const ids = responses.map((response) => response.body.id as number);
      expect(new Set(ids).size).toBe(20);
      const collection = await request(app.getHttpServer())
        .get(path)
        .expect(200);
      expect(collection.body).toHaveLength(20);
      await Promise.all(
        ids.map((id) =>
          request(app.getHttpServer()).delete(`${path}/${id}`).expect(204),
        ),
      );
      const after = await request(app.getHttpServer()).get(path).expect(200);
      expect(after.body).toEqual([]);
    },
  );
});
