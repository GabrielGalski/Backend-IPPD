import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, sep } from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let directory: string | undefined;
  let previousDirectory: string | undefined;
  const testRoot = join(process.cwd(), 'test-results');

  beforeAll(async () => {
    previousDirectory = process.env.DATA_DIR;
    await mkdir(testRoot, { recursive: true });
    directory = await mkdtemp(join(testRoot, 'nest-basic-e2e-'));
    process.env.DATA_DIR = directory;

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
  });

  it('/ (GET) returns Hello World!', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterAll(async () => {
    if (directory && !directory.startsWith(testRoot + sep)) {
      throw new Error('Diretório de teste inválido');
    }

    try {
      await app?.close();
    } finally {
      if (previousDirectory === undefined) delete process.env.DATA_DIR;
      else process.env.DATA_DIR = previousDirectory;

      if (directory) {
        await rm(directory, { recursive: true, force: true, maxRetries: 3 });
      }
    }
  });
});
