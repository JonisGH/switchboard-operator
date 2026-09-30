# Switchboard Operator

Switchboard Operator is a conceptual AI-assisted business phone switchboard: it aims to handle incoming calls, resolve suitable requests during the conversation, and create structured WorkOrders only when human follow-up is needed. This independent engineering portfolio project is not associated with any employer or company. It explores product thinking, system design, frontend/backend integration, and pragmatic architecture. All demo data must be fictional.

## Target Architecture 

The diagram below shows the intended architecture and how the system can evolve beyond the current MVP.
Calls and WorkOrders are persisted; the diagram's realtime voice and provider paths remain future concepts.

![Switchboard Operator system architecture](docs/images/system-architecture.png)

## Current state (Milestone 4)

The application persists fictional Calls and WorkOrders in PostgreSQL. The **Simulate call** action submits one of four backend-defined fictional conversations. The backend records a transcript, validates a deterministic mock AI suggestion, and finalizes the Call and optional WorkOrder in one transaction. Call History displays all Calls; the Work Queue displays only `OPEN` and `IN_PROGRESS` WorkOrders, ordered by the originating Call's start time. An undetermined Call outcome (`null`) differs from `INCOMPLETE`. There is **no live call ingestion, external AI, audio, or telephony integration**. The `/health` endpoint checks API liveness, not database readiness.

## Local development

Requires Node.js 26 (or a compatible recent Node.js version), pnpm 11, Docker, and Docker Compose. Run from the repository root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
docker compose up -d db
pnpm db:validate
pnpm db:migrate
pnpm db:generate
pnpm db:seed
pnpm dev
```

Open http://127.0.0.1:5173. The API at http://127.0.0.1:3001 exposes `GET /health`, `GET /calls`, `GET /work-orders`, `POST /calls/:callId/work-order`, and `POST /simulated-calls`; Vite forwards `/api/*` requests to it. PostgreSQL is available on `127.0.0.1:5433` with **demo-only** credentials in `docker-compose.yml`. Migrations create the Call and WorkOrder tables and add nullable simulation artifacts; `db:generate` creates the local Prisma client. `db:seed` adds five fictional Calls and one WorkOrder; repeat runs preserve existing seed records. Stop the local DB with `docker compose down` (data remains in the named volume).

The UI offers opening-hours (caller confirms), missing-delivery (human follow-up), transfer, and unclear-ending scenarios. `POST /simulated-calls` accepts `{ "callId": "<client-generated UUID>", "scenarioKey": "OPENING_HOURS_V1" }`. A first completion returns 201; a repeat with the same ID and scenario returns the persisted result with 200; a conflicting scenario returns 409. The client-generated Call ID is a **simulation-specific retry identity**, not the general idempotency strategy for telephony integrations. If processing fails, the pending Call remains retryable. The transcript contains fictional text only.

To create a WorkOrder through the API, send a fictional title and optional description to `POST /calls/<callId>/work-order`. Only a Call with outcome `HUMAN_ACTION_REQUIRED` is eligible. The first successful request returns 201; retries return the existing WorkOrder with 200. The unique `callId` database constraint prevents duplicate WorkOrders. No authentication is implemented: use this API **only** with fictional data in local development.

Checks:

```bash
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

`pnpm test` runs the database-free tests. For `pnpm test:integration`, prepare a separate PostgreSQL schema (do not use `public` or demo records):

```bash
docker compose up -d --wait db
docker compose exec -T db psql -U switchboard -d switchboard -c 'CREATE SCHEMA IF NOT EXISTS switchboard_sim_test'
export TEST_DATABASE_URL='postgresql://switchboard:switchboard_local_only@127.0.0.1:5433/switchboard?schema=switchboard_sim_test'
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @switchboard/api exec prisma migrate deploy
pnpm test:integration
```

The integration command **fails** if `TEST_DATABASE_URL` does not explicitly name `switchboard_sim_test` or PostgreSQL is unavailable. CI creates that schema and runs both test commands. Prisma CLI and the runtime adapter both use the `?schema=` URL parameter; the runtime defaults to `public` when omitted.

The API build can be started separately with `pnpm --filter @switchboard/api start` after `pnpm build`. Configuration examples are in `apps/api/.env.example`; real `.env` files are ignored by Git.

## Stack and architecture

- `apps/web`: React, Vite, Tailwind CSS, shadcn/ui primitives, CSS Modules for page-specific styling, React Testing Library.
- `apps/api`: Fastify, TypeScript, Vitest, Calls and WorkOrders modules, a synchronous mock AI provider, and Prisma with the PostgreSQL driver adapter.
- `packages/shared`: Zod contracts for health, Call History, Work Queue, and the structured simulation result.
- `docker-compose.yml`: local PostgreSQL. See [architecture and planned workflow](docs/architecture.md).

Fictional seed data still provides every outcome and a pending Call. New simulated Calls pass through the backend workflow: the opening-hours caller confirms resolution without a WorkOrder, while the delivery caller requests human follow-up and receives one. Transfer and incomplete scenarios do not create WorkOrders by default. Mock AI output is a suggestion, not a human-approved record or a claim of real-world resolution.

## Limitations and next steps

Call History and the Work Queue are read-only views without pagination or filters; the result panel shows the most recent simulation response, not a durable Call Details view. There is no status-editing or priority workflow yet. A later milestone will add human review and editable content. A production service would require authentication, authorization, auditability, and deployment hardening. Transcripts and audio would need explicit retention, privacy, storage, GDPR, and processing-location decisions before any real caller information could be used. **Do not use real caller information in this prototype.**
