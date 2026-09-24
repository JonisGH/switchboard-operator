# Switchboard Operator

Switchboard Operator explores an AI-assisted healthcare telephone exchange: log incoming calls, help callers resolve suitable nonclinical questions, and create staff tickets only when human follow-up is needed. It is a portfolio **technical demonstration**, not a healthcare service. Use fictional caller information only.

## Current state (Milestone 1)

The workspace contains a React/TypeScript shell, a Fastify liveness endpoint, a shared Zod response contract, and local PostgreSQL/Prisma configuration. The browser displays the API connection status. **There are no calls, tickets, AI assistant, database tables, or patient records yet.** The database is not queried by `/health`.

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

The intended MVP will show both a confirmed AI-resolved administrative call **without a ticket** and a staff-required call **with a ticket**, through the same backend workflow. Neither branch is implemented yet.

## Limitations and next steps

Milestone 2 introduces fictional calls and a real calls API/dashboard. Later milestones add conditional ticket creation, a staff work queue, simulated AI output, and human review. Future production work would require authentication, authorization, auditability, retention policies, secured storage, GDPR and healthcare regulatory assessment, clinically validated scope and controls, reliable asynchronous processing, and deployment hardening. **Do not use this prototype with real healthcare data.**
