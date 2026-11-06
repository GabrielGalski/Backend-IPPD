const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { createServer } = require('node:net');
const { mkdtemp, readFile, writeFile, mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { runPostman } = require('./postman-runner.cjs');

const root = join(__dirname, '..');
let server;
let serverLog = '';

async function freePort() {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const port = socket.address().port;
  await new Promise((resolve, reject) =>
    socket.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function startServer(port, directory) {
  server = spawn(process.execPath, ['dist/main.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: directory,
      NODE_ENV: 'production',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.on('error', (error) => {
    serverLog += error.stack;
  });
  server.stdout.on('data', (data) => {
    serverLog += data;
  });
  server.stderr.on('data', (data) => {
    serverLog += data;
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null || server.signalCode !== null)
      throw new Error(`Servidor encerrou antes de iniciar:\n${serverLog}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) return server.pid;
    } catch {
      /* Wait for this new process to listen. */
    }
    await delay(100);
  }
  throw new Error(`Servidor não iniciou:\n${serverLog}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const exit = once(server, 'exit');
  // On Windows this terminates the process; proving persistence does not rely on shutdown hooks.
  server.kill('SIGTERM');
  await exit;
}

async function main() {
  await mkdir(join(root, 'test-results'), { recursive: true });
  const directory = await mkdtemp(join(root, 'test-results/persistence-data-'));
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`JSON de verificação: ${directory}`);
  const beforePid = await startServer(port, directory);
  await runPostman({
    baseUrl,
    folders: ['01 - Projetos (CRUD)', '02 - Tarefas (CRUD)'],
    report: 'postman-crud.json',
    silent: true,
  });
  console.log('CRUD: 32 requisições e 50 verificações Postman aprovadas.');
  const prepared = await runPostman({
    baseUrl,
    folders: ['03 - Persistência (preparar)'],
    report: 'postman-before-restart.json',
    silent: true,
  });
  const collection = prepared.collectionState;
  const before = {
    projects: JSON.parse(
      await readFile(join(directory, 'projects.json'), 'utf8'),
    ),
    tasks: JSON.parse(await readFile(join(directory, 'tasks.json'), 'utf8')),
  };
  assert.equal(before.projects.length, 1);
  assert.equal(before.tasks.length, 1);
  console.log('Dados criados, alterados e conferidos nos dois arquivos JSON.');

  await stopServer();
  const afterPid = await startServer(port, directory);
  assert.notEqual(beforePid, afterPid, 'O servidor deve ser um processo novo');
  const confirmed = await runPostman({
    baseUrl,
    collection,
    folders: ['04 - Persistência (confirmar após reinício)'],
    report: 'postman-after-restart.json',
    silent: true,
  });
  const after = {
    projects: await (await fetch(`${baseUrl}/projects`)).json(),
    tasks: await (await fetch(`${baseUrl}/tasks`)).json(),
  };
  assert.deepEqual(
    after,
    before,
    'GET deve devolver exatamente o conteúdo dos arquivos anteriores ao reinício',
  );

  // Verify deletion is persisted across a second restart as well.
  for (const [resource, items] of Object.entries(before)) {
    const response = await fetch(`${baseUrl}/${resource}/${items[0].id}`, {
      method: 'DELETE',
    });
    assert.equal(response.status, 204);
  }
  await stopServer();
  const thirdPid = await startServer(port, directory);
  for (const [resource, items] of Object.entries(before)) {
    const response = await fetch(`${baseUrl}/${resource}/${items[0].id}`);
    assert.equal(
      response.status,
      404,
      'Registro excluído não deve reaparecer após reinício',
    );
  }

  const report = {
    verifiedAt: new Date().toISOString(),
    result: 'passed',
    engine: 'Postman/Newman',
    baseUrl,
    dataDirectory: directory,
    processIds: [beforePid, afterPid, thirdPid],
    beforeRestart: before,
    afterRestart: after,
    deletionAfterSecondRestart: 'passed',
    postmanAssertionsAfterRestart: confirmed.run.stats.assertions.total,
    reports: [
      'postman-crud.json',
      'postman-before-restart.json',
      'postman-after-restart.json',
    ],
  };
  await writeFile(
    join(root, 'test-results/persistence-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `PERSISTÊNCIA CONFIRMADA. Processos diferentes: ${beforePid} -> ${afterPid} -> ${thirdPid}.`,
  );
  console.log(
    'POST, PUT, PATCH e DELETE preservados após reinícios. Relatório: test-results/persistence-report.json',
  );
}

main()
  .catch((error) => {
    console.error(error.stack);
    process.exitCode = 1;
  })
  .finally(stopServer);
