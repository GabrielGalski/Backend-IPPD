# AGENTS.md

## Application and storage

This NestJS API has TasksModule (`/tasks`) and ProjectsModule (`/projects`). It runs without external service credentials. NestJS Observe from the original starter is not configured.

JSON files live in `DATA_DIR` (default: `./data`). Docker Compose mounts the named volume `api-data` at `/app/data`. Keep one application process per data directory. Preserve the serialized read/modify/write transaction and atomic replacement in `JsonFileStore`.

Use isolated directories under `test-results` for tests; do not modify working JSON data. Unit tests remain in `src/**/*.spec.ts`. Run `npm test -- --runInBand`, `npm run lint`, and `npm run build` when changing the API or storage.

Keep the root README limited to Project setup, Compile and run the project, and Run tests. The Postman collection, the separate end-to-end test directory, and their helper scripts were removed; they are not required to build or run the API.
