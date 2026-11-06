# AGENTS.md

## Application and storage

This NestJS API has TasksModule (`/tasks`) and ProjectsModule (`/projects`). It runs without external service credentials. NestJS Observe from the original starter is not configured.

JSON files live in `DATA_DIR` (default: `./data`). Docker Compose mounts the named volume `api-data` at `/app/data`. Keep one application process per data directory. Preserve the serialized read/modify/write transaction and atomic replacement in `JsonFileStore`.

Use isolated directories under `test-results` for tests; do not modify working JSON data. Run `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run lint`, `npm run build`, and `npm run test:persistence` when changing the API or storage. The last command runs the Postman collection with real server process restarts.

Keep the root README limited to Project setup, Compile and run the project, and Run tests. Postman instructions belong in `postman/COMO_TESTAR.md`.
