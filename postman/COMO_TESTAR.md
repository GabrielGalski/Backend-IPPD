# Testar a API no Postman

## Iniciar o servidor

Com Node.js 24 e npm instalados, execute na raiz:

```bash
npm ci
npm run build
npm run start:prod
```

Ou, com Docker Desktop em execução:

```bash
docker compose up --build -d
```

Use apenas uma dessas opções na porta 3000. A API responde em `http://localhost:3000`.

## Importar e executar a coleção

Os arquivos versionados contêm apenas as definições das requisições, testes e exemplos de JSON. IDs e variáveis de execução começam vazios e são preenchidos automaticamente pelos testes. O ambiente local aponta para `http://localhost:3000`.

1. No Postman, selecione **Import** e importe `postman/Nest-JSON-API.postman_collection.json` e `postman/Local.postman_environment.json`.
2. Selecione o ambiente **Nest JSON API - Local**, com `baseUrl = http://localhost:3000`.
3. Na coleção **Nest JSON API - Tarefas e Projetos**, abra a pasta **01 - Projetos (CRUD)** e use **Run folder**. Execute todas as requisições na ordem, com uma iteração.
4. Repita para **02 - Tarefas (CRUD)**. Os testes verificam os códigos HTTP, o conteúdo retornado, validações, exclusão e erros 404. Os IDs são preenchidos automaticamente pelos POSTs.
5. Para enviar uma requisição isolada, abra-a e use **Send**. Execute o POST primeiro para preencher o ID usado nas demais rotas.

## Rotas do segundo módulo

| Método | Rota            | Corpo JSON                                                                 | Resposta esperada                 |
| ------ | --------------- | -------------------------------------------------------------------------- | --------------------------------- |
| GET    | `/projects`     | Nenhum                                                                     | 200, lista                        |
| GET    | `/projects/:id` | Nenhum                                                                     | 200, projeto; 404 se não existir  |
| POST   | `/projects`     | `{"nome":"Meu projeto","descricao":"Exemplo","ativo":true}`                | 201, projeto com ID               |
| PUT    | `/projects/:id` | `{"nome":"Projeto atualizado","descricao":"Descrição nova","ativo":false}` | 200; todos os campos obrigatórios |
| PATCH  | `/projects/:id` | `{"ativo":true}`                                                           | 200; mantém os campos omitidos    |
| DELETE | `/projects/:id` | Nenhum                                                                     | 204, sem corpo                    |

Em POST, apenas `nome` é obrigatório. `descricao` recebe `""` e `ativo` recebe `true` quando omitidos. Em POST/PUT/PATCH, use **Body → raw → JSON**. Campos desconhecidos, tipos incorretos e IDs não numéricos retornam 400. O ID é definido pelo servidor.

O módulo original mantém as mesmas seis rotas em `/tasks`. POST recebe `descricao`, `inicio` e `fim` (inteiros); PUT exige também `status` e `resultado` (lista de números ou `null`); PATCH aceita os campos que você quiser modificar. DELETE retorna 204.

## Confirmar persistência manualmente

1. Execute a pasta **03 - Persistência (preparar)** com **Keep variable values** habilitado nas configurações do Runner. Ela cria um projeto e uma tarefa, altera os dados com PATCH/PUT e guarda uma cópia das respostas nas variáveis da coleção.
2. Aguarde o término das quatro requisições. Pare o servidor com Ctrl+C e inicie novamente com `npm run start:prod`. Se estiver usando Docker, execute `docker compose restart api`.
3. Execute somente a pasta **04 - Persistência (confirmar após reinício)**, mantendo a mesma coleção e ambiente. Não execute a pasta 03 novamente antes da confirmação.
4. Os dois GETs devem retornar 200 e passar no teste **Registro idêntico ao salvo antes do reinício**. Os IDs, os dados originais e as alterações precisam ser iguais. Os registros ficam disponíveis para inspeção.

No modo local, os dados ficam em `data/projects.json` e `data/tasks.json`; `DATA_DIR` pode definir outro diretório. No Docker, ficam no volume `nest-json-api_api-data`, montado em `/app/data`. `docker compose down` preserva esse volume; `docker compose down -v` o apaga. Os dados locais e os do Docker são armazenamentos separados. Use uma única instância da API por diretório/volume JSON.

## Verificação automática com reinício real

```bash
npm run build
npm run test:persistence
```

Esse comando inicia sua própria API em uma porta livre, executa a coleção com Newman (o executor de coleções do Postman), encerra o processo, inicia um processo novo com os mesmos arquivos e executa os GETs de confirmação. Também verifica que exclusões não reaparecem depois de outro reinício. Usa dados isolados em `test-results`, sem alterar seus arquivos de trabalho.

O resultado fica em `test-results/persistence-report.json` e nos relatórios `test-results/postman-*.json`. Para testar somente CRUD contra uma API já iniciada, execute `npm run test:postman`. Para outra URL, defina a variável de ambiente `BASE_URL`.
