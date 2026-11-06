const { runPostman } = require('./postman-runner.cjs');

runPostman({
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  folders: ['01 - Projetos (CRUD)', '02 - Tarefas (CRUD)'],
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
