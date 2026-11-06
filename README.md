## Project setup

```bash
npm ci
```

## Compile and run the project

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Docker (API at http://localhost:3000; JSON in a persistent volume)
docker compose up --build -d

# Restart the container, preserving the data
docker compose restart api

# Stop the containers, preserving the volume
docker compose down
```

## Run tests

```bash
# Unit tests
npm test -- --runInBand

# End-to-end test
npm run test:e2e -- --runInBand

# Lint
npm run lint
```
