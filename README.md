# Switchboard Operator

Switchboard Operator is a conceptual AI-assisted business phone switchboard: it aims to handle incoming calls, resolve suitable requests during the conversation, and create structured WorkOrders only when human follow-up is needed. This independent engineering portfolio project is not associated with any employer or company. It explores product thinking, system design, frontend/backend integration, and pragmatic architecture. All demo data must be fictional.

## Target Architecture 

The diagram below shows the intended architecture and how the system can evolve beyond the current MVP.
WorkOrders are now persisted; orchestration and voice paths remain future concepts.

![Switchboard Operator system architecture](docs/images/system-architecture.png)

## Current state (Milestone 3)

The application persists fictional Calls and WorkOrders in PostgreSQL. Call History displays all Calls; the Work Queue displays only `OPEN` and `IN_PROGRESS` WorkOrders, ordered by their originating Call's start time. Both views validate backend responses using shared Zod contracts. An undetermined Call outcome (`null`) differs from `INCOMPLETE`. **There is no AI assistant, live call ingestion, transcript, or telephony integration yet.** The `/health` endpoint checks API liveness, not database readiness.

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

Open http://127.0.0.1:5173. The API at http://127.0.0.1:3001 exposes `GET /health`, `GET /calls`, `GET /work-orders`, and `POST /calls/:callId/work-order`; Vite forwards `/api/*` requests to it. PostgreSQL is available on `127.0.0.1:5433` with **demo-only** credentials in `docker-compose.yml`. Migrations create the Call and WorkOrder tables; `db:generate` creates the local Prisma client. `db:seed` adds five fictional Calls and one WorkOrder for the human-action-required Call; repeat runs preserve existing seed records. Stop the local DB with `docker compose down` (data remains in the named volume).

To create a WorkOrder through the API, send a fictional title and optional description to `POST /calls/<callId>/work-order`. Only a Call with outcome `HUMAN_ACTION_REQUIRED` is eligible. The first successful request returns 201; retries return the existing WorkOrder with 200. The unique `callId` database constraint prevents duplicate WorkOrders. No authentication is implemented: use this API **only** with fictional data in local development.

Checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

The API build can be started separately with `pnpm --filter @switchboard/api start` after `pnpm build`. Configuration examples are in `apps/api/.env.example`; real `.env` files are ignored by Git.

## Stack and architecture

- `apps/web`: React, Vite, Tailwind CSS, shadcn/ui primitives, CSS Modules for page-specific styling, React Testing Library.
- `apps/api`: Fastify, TypeScript, Vitest, Calls and WorkOrders modules, and Prisma with the PostgreSQL driver adapter.
- `packages/shared`: Zod contracts for health, Call History, and the Work Queue.
- `docker-compose.yml`: local PostgreSQL. See [architecture and planned workflow](docs/architecture.md).

Fictional seed data includes `AI_RESOLVED`, `HUMAN_ACTION_REQUIRED`, `TRANSFERRED`, `INCOMPLETE`, and a Call without an outcome. The WorkOrder for the eligible seeded Call is created by the backend service; the AI-resolved Call has none. These are stored demonstration records, **not the result of an implemented AI workflow**. Real telephony and AI integrations may be mocked during early development; the architecture is designed to evolve incrementally.

## Limitations and next steps

Call History and the Work Queue are read-only views without pagination or filters; `GET /calls/:id` waits for a real Call Details view. No status transitions or priority assignment exist yet. A later milestone will simulate the call conversation and determine its outcome; another will add human review. A production service would require authentication, authorization, auditability, retention policies, secured storage, privacy and regulatory assessment where applicable, reliable asynchronous processing, and deployment hardening. Do not use real caller information in this prototype.
