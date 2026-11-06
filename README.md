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

# End-to-end tests
npm run test:e2e -- --runInBand

# Postman collection (start the API first)
npm run test:postman

# Postman collection with a real server restart (build first)
npm run build
npm run test:persistence

# Lint
npm run lint
```
