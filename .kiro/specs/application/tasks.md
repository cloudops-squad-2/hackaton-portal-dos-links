# Implementation Plan: Portal dos Links

Status legend: `[ ]` todo · `[x]` done · `[-]` in progress

---

## 1 — API (NestJS + Fastify + Prisma)

- [x] **TASK-API-01** Initialize NestJS project with Fastify adapter and Vitest
- [x] **TASK-API-02** Add `GET /health` endpoint (no DB dependency)
- [x] **TASK-API-03** Configure Prisma 7 with `@prisma/adapter-pg` and `DATABASE_URL` via `ConfigService`
- [x] **TASK-API-04** Define `Link` model in `prisma/schema.prisma`
- [x] **TASK-API-05** Implement `POST /api/links` — create short link with `nanoid(7)` and optional TTL
- [x] **TASK-API-06** Implement `GET /:code` — resolve and redirect (302), increment `clickCount`, return 410 on expiry
- [x] **TASK-API-07** Implement `GET /api/links` — paginated and sortable list
- [ ] **TASK-API-08** Add `POST /api/links` with custom slug (vanity URL) — `REQ-CHAR-02`
- [ ] **TASK-API-09** Add `GET /api/links/:code/preview` — return link metadata without redirecting
- [ ] **TASK-API-10** Add `GET /api/links/:code/analytics` — return click history / stats per link
- [ ] **TASK-API-11** Add character-consistent error messages (not generic HTTP text) — `REQ-CHAR-03`
- [ ] **TASK-API-12** Write unit tests for `LinkService` (create, resolve, expiry, retry logic)

---

## 2 — Database

- [x] **TASK-DB-01** Set up Prisma migrations folder
- [ ] **TASK-DB-02** Create and run initial migration (`prisma migrate dev`)
- [x] **TASK-DB-03** Add `docker-compose.yml` at repo root for local PostgreSQL + API + frontend dev setup

---

## 3 — Frontend

- [ ] **TASK-FE-01** Scaffold frontend project (React + Vite recommended; output to `frontend/`)
- [x] **TASK-FE-02** Add `Dockerfile` (multi-stage: Vite build → nginx:alpine)
- [ ] **TASK-FE-03** Implement create-link form (`url` + optional `expiresIn`)
- [ ] **TASK-FE-04** Implement link list view with `clickCount`, `createdAt`, expiry badge
- [ ] **TASK-FE-05** Add copy-to-clipboard button per link
- [ ] **TASK-FE-06** Add QR code generation per link
- [ ] **TASK-FE-07** Implement link preview page (`/:code/preview`)
- [ ] **TASK-FE-08** Apply portal character — mascot, color palette, typography, tone of voice
- [ ] **TASK-FE-09** Instrument with OpenTelemetry browser SDK; propagate `traceparent` on every API fetch
- [ ] **TASK-FE-10** Add frontend tests (at minimum smoke tests for the form and list)

---

## 4 — CI Pipeline

- [x] **TASK-CI-01** Create `.github/workflows/ci.yml` with `gitleaks`, `test-api`, `build` jobs
- [x] **TASK-CI-02** Add `prisma generate` step in `test-api` job before `tsc` compile
- [x] **TASK-CI-03** Add `test-frontend` job (install → test → build); gate `build` matrix on it
- [x] **TASK-CI-04** Add `update-manifests` job that checks out the config repo, bumps image tags via `yq` and opens a PR to `develop`
- [ ] **TASK-CI-05** Add `CONFIG_REPO_PAT` secret to the app repo on GitHub (needs `repo` + `workflow` scope)
- [x] **TASK-CI-06** Add concurrency group to `update-manifests` to prevent race conditions
- [x] **TASK-CI-07** Add `sast` job with Semgrep (`p/typescript`, `p/nodejs`, `p/secrets`) — non-blocking (`continue-on-error: true`)
- [x] **TASK-CI-08** Add `workflow_dispatch` trigger for manual pipeline runs from GitHub UI

---

## 5 — Observability (API side)

- [x] **TASK-OBS-01** Install `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, OTLP exporter
- [x] **TASK-OBS-02** Initialize OTel SDK in `main.ts` before NestJS bootstrap
- [x] **TASK-OBS-03** Add manual spans in `LinkService.create` and `LinkService.resolve`
- [x] **TASK-OBS-04** Export metrics: `links.created`, `links.redirected`, `links.expired`, `links.not_found`, `links.click_limit_reached`, HTTP duration histogram
- [x] **TASK-OBS-05** Add `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` to env var documentation
- [x] **TASK-OBS-06** Add `otel-collector` service to `docker-compose.yml`; fix `OTEL_EXPORTER_OTLP_ENDPOINT` (localhost → service name), add `OTEL_SEMCONV_STABILITY_OPT_IN=http`, `OTEL_TRACES_SAMPLER`; create `otel-collector-config.yaml`

---

## 6 — Personality & Exclusive Features

- [ ] **TASK-CHAR-01** Define portal identity — mascote name, personality, color palette, tone of voice (document in README)
- [ ] **TASK-CHAR-02** Implement vanity URL support (`POST /api/links` with optional `customCode` field)
- [ ] **TASK-CHAR-03** Implement link preview page (frontend + API endpoint)
- [ ] **TASK-CHAR-04** Implement per-link analytics view in the frontend
- [ ] **TASK-CHAR-05** Apply identity consistently across all frontend components and API error messages

---

## 7 — Documentation

- [ ] **TASK-DOC-01** Update `README.md` with: project overview, character/identity, how to run locally (`docker compose up`), architecture diagram, how Kiro was used (prompts + decisions)
- [ ] **TASK-DOC-02** Document all environment variables in README or a dedicated `.env.example`

---

## 8 — Docker Compose

- [x] **TASK-DOCKER-01** Write `docker-compose.yml` at the repo root with three services: `postgres`, `api`, `frontend`, all on a shared bridge network `portal-net` — `REQ-DC-01`
- [x] **TASK-DOCKER-02** Configure `build.context` for `api` (`./api`) and `frontend` (`./frontend`) so the compose file builds from source — `REQ-DC-02`
- [x] **TASK-DOCKER-03** Expose ports: `api` → `3000:3000` (HTTP) and `4317:4317` (OTLP/gRPC); `frontend` → `80:80`; `postgres` → `5432:5432` — `REQ-DC-03`, `REQ-DC-04`, `REQ-DC-05`
- [x] **TASK-DOCKER-04** Declare named volume `postgres_data` mounted at `/var/lib/postgresql/data` in the `postgres` service — `REQ-DC-06`
- [x] **TASK-DOCKER-05** Wire all environment variables: `DATABASE_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `PORT` for `api`; `VITE_API_URL` for `frontend` — `REQ-DC-07`
- [x] **TASK-DOCKER-06** Set `depends_on` ordering: `api` depends on `postgres` (`condition: service_healthy`); `frontend` depends on `api` (`condition: service_started`) — `REQ-DC-08`
- [x] **TASK-DOCKER-07** Add `healthcheck` to `postgres` using `pg_isready -U $${POSTGRES_USER}` (interval 5s, timeout 5s, retries 5) — `REQ-DC-09`
- [x] **TASK-DOCKER-08** Create `.env.example` at repo root documenting `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `VITE_API_URL`, `OTEL_SERVICE_NAME` with placeholder values and inline comments — `REQ-DC-10`

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["TASK-API-08", "TASK-API-09", "TASK-API-10", "TASK-API-11", "TASK-DB-02", "TASK-DOCKER-01", "TASK-FE-01", "TASK-CI-03", "TASK-CHAR-01", "TASK-DOC-01", "TASK-DOC-02"]
    },
    {
      "id": 1,
      "tasks": ["TASK-API-12", "TASK-DOCKER-02", "TASK-FE-02", "TASK-CI-04", "TASK-CHAR-02", "TASK-CHAR-03", "TASK-CHAR-04"]
    },
    {
      "id": 2,
      "tasks": ["TASK-DOCKER-03", "TASK-DOCKER-04", "TASK-DOCKER-05", "TASK-FE-03", "TASK-FE-04", "TASK-CI-05", "TASK-CHAR-05"]
    },
    {
      "id": 3,
      "tasks": ["TASK-DOCKER-06", "TASK-DOCKER-07", "TASK-FE-05", "TASK-FE-06", "TASK-FE-07", "TASK-CI-06"]
    },
    {
      "id": 4,
      "tasks": ["TASK-DOCKER-08", "TASK-FE-08", "TASK-FE-09", "TASK-FE-10"]
    }
  ]
}
```
