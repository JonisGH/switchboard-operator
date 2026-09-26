# Switchboard Operator

Switchboard Operator is a conceptual AI-assisted business phone switchboard: it aims to handle incoming calls, resolve suitable requests during the conversation, and create structured WorkOrders only when human follow-up is needed. This independent engineering portfolio project is not associated with any employer or company. It explores product thinking, system design, frontend/backend integration, and pragmatic architecture. All demo data must be fictional.

## Target Architecture 

The diagram below shows the intended architecture and how the system can evolve beyond the current MVP.

![Switchboard Operator system architecture](docs/images/system-architecture.png)

## Current state (Milestone 1)

The workspace contains a React/TypeScript shell, a Fastify liveness endpoint, a shared Zod response contract, and local PostgreSQL/Prisma configuration. The browser displays the API connection status. **There are no Calls, WorkOrders, AI assistant, domain tables, or caller records yet.** The database is not queried by `/health`.

## Local development

Requires Node.js 26 (or a compatible recent Node.js version), pnpm 11, Docker, and Docker Compose. Run from the repository root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
docker compose up -d db
pnpm db:validate
pnpm db:generate
pnpm dev
```

Open http://127.0.0.1:5173. The API is at http://127.0.0.1:3001/health; the Vite development server forwards `/api/*` requests to it. PostgreSQL is available on `127.0.0.1:5433` with **demo-only** credentials in `docker-compose.yml`. `pnpm db:generate` generates a client but does not create any tables; the first schema/migration belongs to the Calls milestone. Stop the local DB with `docker compose down` (data remains in the named volume).

Checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

The API build can be started separately with `pnpm --filter @switchboard/api start` after `pnpm build`. Configuration examples are in `apps/api/.env.example`; real `.env` files are ignored by Git.

## Stack and architecture

- `apps/web`: React, Vite, Tailwind CSS, shadcn/ui primitives, CSS Modules for page-specific styling, React Testing Library.
- `apps/api`: Fastify, TypeScript, Vitest, Prisma configuration.
- `packages/shared`: shared Zod contract for the health response; domain contracts will follow when implemented.
- `docker-compose.yml`: local PostgreSQL. See [architecture and planned workflow](docs/architecture.md).

The intended MVP will show both a caller-confirmed `AI_RESOLVED` call **without a WorkOrder** (for example, an opening-hours question) and a `HUMAN_ACTION_REQUIRED` call **with a WorkOrder** (for example, a delivery issue), through the same backend workflow. Neither branch is implemented yet. Real telephony and AI integrations may be mocked during early development; the architecture is designed to evolve incrementally.

## Limitations and next steps

Milestone 2 introduces fictional calls and a real Calls API/dashboard. Later milestones add conditional WorkOrder creation, a Work Queue, simulated AI output, and human review. A production service would require authentication, authorization, auditability, retention policies, secured storage, privacy and regulatory assessment where applicable, reliable asynchronous processing, and deployment hardening. Do not use real caller information in this prototype.