# Requirements Document

## Introduction

Cloud-native link shortener built for the CloudOps Bootcamp Hackathon.
This repository owns the application code (API, frontend, database schema) and the CI pipeline.
The GitOps/config repository owns all Kubernetes manifests and is watched by ArgoCD.

---

## Requirements

### 1 — API (NestJS + Fastify + Prisma)

#### 1.1 Core endpoints

- **REQ-API-01** `POST /api/links` — create a short link from a long URL. Returns the created `Link` object.
- **REQ-API-02** `GET /:code` — resolve a short code and redirect (HTTP 302) to the original URL.
- **REQ-API-03** `GET /api/links` — list all links with pagination (`page`, `limit`), sorting (`sortBy`, `order`).
- **REQ-API-04** `GET /health` — liveness probe used by Kubernetes. Must return HTTP 200 with no database dependency.

#### 1.2 Business rules

- **REQ-API-05** Short codes are generated with `nanoid(7)`. On unique-constraint collision the service retries up to 3 times before throwing.
- **REQ-API-06** Links support optional TTL (`expiresIn` seconds). Expired links return HTTP 410 Gone.
- **REQ-API-07** Every successful redirect increments `clickCount` on the `Link` record.
- **REQ-API-08** `clickCount` and `createdAt` are sortable fields in the list endpoint.

#### 1.3 Database

- **REQ-DB-01** PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter.
- **REQ-DB-02** Schema output goes to `src/generated/prisma` (never committed — generated in CI and Docker build).
- **REQ-DB-03** `Link` model fields: `id` (cuid), `code` (unique), `originalUrl`, `clickCount` (default 0), `createdAt` (default now), `expiresAt` (nullable). Index on `createdAt`.
- **REQ-DB-04** `DATABASE_URL` is injected via environment variable; the app throws at startup if it is missing.

#### 1.4 Observability

- **REQ-OBS-01** The API must be instrumented with OpenTelemetry SDK, exporting traces via OTLP.
- **REQ-OBS-02** Traces must propagate across all three components: frontend → API → database.
- **REQ-OBS-03** Metrics exported: `links.created` (counter), `links.redirected` (counter), `links.expired` (counter), HTTP request duration (histogram).

---

### 2 — Frontend

- **REQ-FE-01** Form to create a new short link (URL input + optional TTL field).
- **REQ-FE-02** List view showing all links with click count and creation date.
- **REQ-FE-03** Copy-to-clipboard button for each short link.
- **REQ-FE-04** QR code generation for each short link.
- **REQ-FE-05** Visual indicator for expired links.
- **REQ-FE-06** Instrumented with OpenTelemetry browser SDK; traces propagated to the API via W3C `traceparent` header.

---

### 3 — CI Pipeline (GitHub Actions)

- **REQ-CI-01** Triggers on push to `main`/`develop` and on pull requests targeting both branches.
- **REQ-CI-02** Secret scan with `gitleaks` (pinned version) runs on every trigger.
- **REQ-CI-03** API job: `npm ci` → `prisma generate` → `tsc` compile → `vitest run`. Must pass before any image is built.
- **REQ-CI-04** Frontend job: install → test → build. Must pass before image is built.
- **REQ-CI-05** Matrix build for `api` and `frontend` images pushed to GHCR. Images are only pushed on `push` events (not PRs). Tags use the 7-character short SHA.
- **REQ-CI-06** `update-manifests` job runs only on push to `develop`. It checks out the config repo using `CONFIG_REPO_PAT`, bumps image tags in `k8s/kustomization.yaml` via `yq`, creates a dedicated `deploy/<sha>` branch, and opens a PR to `develop` using `gh pr create`. ArgoCD syncs after the PR is merged.
- **REQ-CI-07** Concurrency group on `update-manifests` (`cancel-in-progress: false`) prevents race conditions when two commits land in quick succession.
- **REQ-CI-08** SAST job with Semgrep (`p/typescript`, `p/nodejs`, `p/secrets`) runs in parallel — non-blocking (`continue-on-error: true`), deliberately excluded from `build` gates.
- **REQ-CI-09** `workflow_dispatch` trigger enables manual pipeline runs from the GitHub UI without a code push.

---

### 4 — Personality & Exclusive Features

> This is 30% of the hackathon score. The API and frontend must reflect the portal's character.

- **REQ-CHAR-01** The portal has a defined mascot/character with name, personality and visual identity applied consistently across the frontend.
- **REQ-CHAR-02** At least three exclusive features are implemented beyond the core shortener. Examples already in the codebase: link expiration (TTL), click count tracking. Additional features to implement: vanity URL (custom slug), link preview before redirect, analytics dashboard per link.
- **REQ-CHAR-03** The API returns character-consistent error messages (not generic HTTP text).

---

### 5 — Non-functional

- **REQ-NF-01** All Docker images use multi-stage builds. Final stage is based on `node:*-alpine`. Runs as non-root (`USER node`).
- **REQ-NF-02** No secrets or `.env` files committed. All credentials injected via environment variables or Kubernetes Secrets.
- **REQ-NF-03** `prisma generate` runs in both CI (`test-api` job) and Docker build (`RUN npx prisma generate`) — never rely on committed generated files.
- **REQ-NF-04** `DATABASE_URL` must not be hardcoded anywhere in the codebase.
- **REQ-NF-05** API liveness probe (`GET /health`) must not depend on the database.

---

## Out of scope for this repository

The following belong to the **config repository**:

- Kubernetes Deployments, Services, ConfigMaps, Secrets, PVCs
- `kustomization.yaml` (managed by the CI pipeline via `kustomize edit set image`)
- ArgoCD `Application` manifest
- OpenTelemetry Collector configuration
- Grafana dashboards and datasource definitions

---

### 6 — Docker Compose

- **REQ-DC-01** The repository root must contain a `docker-compose.yml` that starts the full stack (`postgres`, `api`, `frontend`) with a single `docker compose up` command, requiring no registry access.
- **REQ-DC-02** Each service (`api`, `frontend`) must declare a `build.context` pointing to its local `Dockerfile` so the compose file works for local development from source.
- **REQ-DC-03** The `api` service must expose two ports: `3000` (HTTP API) and `4317` (OTLP/gRPC, used as `OTEL_EXPORTER_OTLP_ENDPOINT`).
- **REQ-DC-04** The `frontend` service must expose port `80`.
- **REQ-DC-05** The `postgres` service must expose port `5432`.
- **REQ-DC-06** The `postgres` service must mount a named persistent volume so database data survives `docker compose down`.
- **REQ-DC-07** All required environment variables must be wired in the compose file: `DATABASE_URL` and `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` and `PORT` for the `api` service; `VITE_API_URL` for the `frontend` service.
- **REQ-DC-08** The `api` service must declare `depends_on: postgres` and the `frontend` service must declare `depends_on: api`, enforcing correct startup order.
- **REQ-DC-09** The `postgres` service must define a `healthcheck` (e.g. `pg_isready`) so that the `api` service waits for a healthy database before starting, using `condition: service_healthy`.
- **REQ-DC-10** A `.env.example` file at the repository root must document every variable referenced by `docker-compose.yml` with placeholder values and inline comments explaining each variable.
