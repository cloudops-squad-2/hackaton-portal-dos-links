# Portal dos Links

Cloud-native link shortener built for the CloudOps Bootcamp Hackathon

## Repository structure

```
api/        NestJS + Fastify API (Prisma 7, PostgreSQL)
frontend/   React + Vite frontend
.github/    CI/CD pipeline (GitHub Actions)
```

## Getting started

Copy the example env file and fill in the values:

```sh
cp .env.example .env
```

Then start the stack (requires Docker):

```sh
docker compose up
```

---

## Environment variables

### API

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string consumed by Prisma. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ✅ (prod) | — | gRPC endpoint of the OpenTelemetry Collector that receives traces and metrics from the API (e.g. `http://otel-collector:4317`). |
| `OTEL_SERVICE_NAME` | optional | `portal-dos-links-api` | Logical service name shown in traces and metrics. |
| `PORT` | optional | `3000` | Port the Fastify server listens on. |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | optional | `http://localhost:3000` | Base URL of the API, injected at build time by Vite. |

> See [`.env.example`](.env.example) for a ready-to-copy template.
