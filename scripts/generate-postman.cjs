const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const event = (listen, code) => ({
  listen,
  script: { type: 'text/javascript', exec: code },
});
const expectJson = (value) =>
  `pm.test('Campos retornados corretamente', () => pm.expect(pm.response.json()).to.deep.include(${JSON.stringify(value)}));`;
const remember = (key) =>
  `pm.collectionVariables.set('${key}', String(pm.response.json().id));`;
const snapshot = (key) =>
  `pm.collectionVariables.set('${key}', JSON.stringify(pm.response.json()));`;
const equalsSnapshot = (key) =>
  `pm.test('Registro idêntico ao salvo antes do reinício', () => pm.expect(pm.response.json()).to.deep.equal(JSON.parse(pm.collectionVariables.get('${key}'))));`;

function request(
  name,
  method,
  path,
  status,
  body,
  tests = [],
  preRequest = [],
) {
  const item = {
    name,
    request: {
      method,
      header:
        body === undefined
          ? []
          : [{ key: 'Content-Type', value: 'application/json' }],
      url: `{{baseUrl}}${path}`,
      description: name,
      ...(body === undefined
        ? {}
        : {
            body: {
              mode: 'raw',
              raw: JSON.stringify(body, null, 2),
              options: { raw: { language: 'json' } },
            },
          }),
    },
    event: [
      event('test', [
        `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`,
        ...tests,
      ]),
    ],
  };
  if (preRequest.length) item.event.unshift(event('prerequest', preRequest));
  return item;
}

function crudFolder(
  resource,
  label,
  variable,
  create,
  defaults,
  replace,
  patch,
) {
  const idPath = `/${resource}/{{${variable}}}`;
  return {
    name: label,
    description:
      'Execute esta pasta inteira no Runner. Os registros criados aqui são removidos ao final. Nenhum registro anterior é alterado.',
    item: [
      request('01 POST - Criar', 'POST', `/${resource}`, 201, create, [
        remember(variable),
        expectJson({ ...create, ...defaults }),
        "pm.test('ID numérico', () => pm.expect(pm.response.json().id).to.be.a('number')); ",
      ]),
      request('02 GET - Listar', 'GET', `/${resource}`, 200, undefined, [
        "pm.test('Lista JSON', () => pm.expect(pm.response.json()).to.be.an('array'));",
        `pm.test('Lista contém o registro criado', () => pm.expect(pm.response.json().some(item => item.id === Number(pm.collectionVariables.get('${variable}')))).to.equal(true));`,
      ]),
      request('03 GET - Consultar por ID', 'GET', idPath, 200, undefined, [
        expectJson({ ...create, ...defaults }),
      ]),
      request(
        '04 PUT - Substituir todos os campos',
        'PUT',
        idPath,
        200,
        replace,
        [expectJson(replace)],
      ),
      request(
        '05 PATCH - Alterar apenas alguns campos',
        'PATCH',
        idPath,
        200,
        patch,
        [expectJson({ ...replace, ...patch })],
      ),
      request('06 GET - Confirmar alteração', 'GET', idPath, 200, undefined, [
        expectJson({ ...replace, ...patch }),
      ]),
      request(
        '07 POST - Rejeitar campos ausentes',
        'POST',
        `/${resource}`,
        400,
        {},
      ),
      request(
        '08 PUT - Rejeitar substituição incompleta',
        'PUT',
        idPath,
        400,
        patch,
      ),
      request('09 PATCH - Rejeitar mudança de ID', 'PATCH', idPath, 400, {
        id: 999,
      }),
      request(
        '10 PATCH - Rejeitar campo nulo',
        'PATCH',
        idPath,
        400,
        resource === 'projects' ? { ativo: null } : { descricao: null },
      ),
      request('11 GET - Rejeitar ID inválido', 'GET', `/${resource}/abc`, 400),
      request('12 DELETE - Excluir', 'DELETE', idPath, 204, undefined, [
        "pm.test('Sem corpo na exclusão', () => pm.expect(pm.response.text()).to.equal('')); ",
      ]),
      request('13 GET - Registro excluído retorna 404', 'GET', idPath, 404),
      request(
        '14 PUT - Registro inexistente retorna 404',
        'PUT',
        idPath,
        404,
        replace,
      ),
      request(
        '15 PATCH - Registro inexistente retorna 404',
        'PATCH',
        idPath,
        404,
        patch,
      ),
      request(
        '16 DELETE - Registro inexistente retorna 404',
        'DELETE',
        idPath,
        404,
      ),
    ],
  };
}

const collection = {
  info: {
    name: 'Nest JSON API - Tarefas e Projetos',
    _postman_id: '4d4e97ef-f6cd-4580-8ef6-35751cd94db8',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'CRUD completo de tarefas e projetos. Execute 01 e 02 para CRUD; execute 03, reinicie o servidor e execute 04 para confirmar a persistência. Instruções em postman/COMO_TESTAR.md. Nos runs separados, habilite Keep variable values.',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000', type: 'string' },
    ...[
      'projectId',
      'taskId',
      'persistProjectId',
      'persistTaskId',
      'persistProjectSnapshot',
      'persistTaskSnapshot',
      'persistenceToken',
    ].map((key) => ({ key, value: '', type: 'string' })),
  ],
  item: [
    crudFolder(
      'projects',
      '01 - Projetos (CRUD)',
      'projectId',
      { nome: 'Projeto Postman', descricao: 'Criado no Postman' },
      { ativo: true },
      {
        nome: 'Projeto substituído',
        descricao: 'Todos os campos substituídos',
        ativo: false,
      },
      { ativo: true },
    ),
    crudFolder(
      'tasks',
      '02 - Tarefas (CRUD)',
      'taskId',
      { descricao: 'Tarefa Postman', inicio: 1, fim: 10 },
      { status: 'PENDENTE', resultado: null },
      {
        descricao: 'Tarefa substituída',
        inicio: 2,
        fim: 20,
        status: 'EM_ANDAMENTO',
        resultado: [2, 4, 6],
      },
      { status: 'CONCLUIDA', resultado: null },
    ),
    {
      name: '03 - Persistência (preparar)',
      description:
        'Execute uma vez, habilitando Keep variable values. Pare e inicie o servidor ou reinicie o contêiner. Depois execute 04 sem executar 03 novamente.',
      item: [
        request(
          '01 POST - Criar projeto persistente',
          'POST',
          '/projects',
          201,
          {
            nome: 'Persistência {{persistenceToken}}',
            descricao: 'Deve sobreviver ao reinício',
            ativo: true,
          },
          [remember('persistProjectId')],
          [
            "pm.collectionVariables.set('persistenceToken', pm.variables.replaceIn('{{$guid}}')); ",
          ],
        ),
        request(
          '02 PATCH - Salvar projeto e sua fotografia',
          'PATCH',
          '/projects/{{persistProjectId}}',
          200,
          { ativo: false },
          [snapshot('persistProjectSnapshot'), expectJson({ ativo: false })],
        ),
        request(
          '03 POST - Criar tarefa persistente',
          'POST',
          '/tasks',
          201,
          {
            descricao: 'Persistência {{persistenceToken}}',
            inicio: 3,
            fim: 30,
          },
          [remember('persistTaskId')],
        ),
        request(
          '04 PUT - Salvar tarefa e sua fotografia',
          'PUT',
          '/tasks/{{persistTaskId}}',
          200,
          {
            descricao: 'Persistência {{persistenceToken}}',
            inicio: 4,
            fim: 40,
            status: 'CONCLUIDA',
            resultado: [4, 8, 12],
          },
          [
            snapshot('persistTaskSnapshot'),
            expectJson({
              inicio: 4,
              fim: 40,
              status: 'CONCLUIDA',
              resultado: [4, 8, 12],
            }),
          ],
        ),
      ],
    },
    {
      name: '04 - Persistência (confirmar após reinício)',
      description:
        'Execute SOMENTE depois de reiniciar o processo. As respostas completas devem ser iguais às salvas pela pasta 03, inclusive IDs e alterações de PUT/PATCH. Não exclui os registros de demonstração.',
      item: [
        request(
          '01 GET - Projeto preservado após reinício',
          'GET',
          '/projects/{{persistProjectId}}',
          200,
          undefined,
          [equalsSnapshot('persistProjectSnapshot')],
        ),
        request(
          '02 GET - Tarefa preservada após reinício',
          'GET',
          '/tasks/{{persistTaskId}}',
          200,
          undefined,
          [equalsSnapshot('persistTaskSnapshot')],
        ),
      ],
    },
  ],
};

mkdirSync(join(root, 'postman'), { recursive: true });
writeFileSync(
  join(root, 'postman/Nest-JSON-API.postman_collection.json'),
  `${JSON.stringify(collection, null, 2)}\n`,
);
writeFileSync(
  join(root, 'postman/Local.postman_environment.json'),
  `${JSON.stringify(
    {
      id: '4a8de090-bbfe-44ef-a929-45f2c695189d',
      name: 'Nest JSON API - Local',
      values: [
        {
          key: 'baseUrl',
          value: 'http://localhost:3000',
          type: 'default',
          enabled: true,
        },
      ],
      _postman_variable_scope: 'environment',
    },
    null,
    2,
  )}\n`,
);
console.log('Coleção e ambiente Postman gerados.');
