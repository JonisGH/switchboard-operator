# Architecture and decisions

## Implemented in Milestone 1

This is a pnpm workspace with a Vite/React web app, a Fastify API and a small shared Zod health contract. The frontend requests `/api/health` through Vite's local proxy and validates the result. The backend endpoint is **liveness only**, not a database readiness or production health check. Docker Compose supplies PostgreSQL for local development; Prisma is configured but has **no models or migrations yet**. No request data is persisted.

TypeScript across frontend, backend, and contracts reduces boundary drift. Validation remains necessary at runtime: TypeScript alone does not validate HTTP payloads. A modular monolith is planned for calls and tickets because a small, evolving product needs domain boundaries but not separately deployed services. The first milestone only contains a single API route, not empty domain modules.

For the web UI, shadcn/ui primitives live in `apps/web/src/components/ui` and may use Tailwind internally. The foundation page composes Badge and Card, while its one-off layout lives beside it in `App.module.css`. `apps/web/src/index.css` is the single source of shared tokens: shadcn's semantic CSS colors and radius are mapped to Tailwind v4 utilities, and Tailwind-compatible typography, sizing, and spacing values serve both utilities and CSS Modules. Theme-independent values are separate from the light palette; setting `data-theme="dark"` on the document root overrides only the palette. Other named themes can follow the same override convention without changing components. The Tailwind `dark:` selector uses that same attribute, but there is no UI switcher, persistence, or automatic system-preference handling yet. Destructive styling is semantic; add success/warning tokens and variants when real statuses need them. Add application-specific components only when real workflows justify reusable semantics, rather than wrapping layout elements for their own sake.

## Intended domain workflow (not implemented)

An incoming **Call** records the interaction and its outcome. A **Ticket** represents staff work and refers to its source call. These are distinct: a suitable nonclinical administrative call may end in a caller-confirmed `AI_RESOLVED` outcome with **no ticket**, while `STAFF_REQUIRED` produces a ticket. `TRANSFERRED` and `INCOMPLETE` remain explicit outcomes; neither is silently counted as AI resolved nor automatically ticketed without a documented rule. Initial cardinality is zero or one ticket per call, enforced when persistence is added, without assuming all calls must have one. Multiple tickets from a call should only be introduced if later requirements justify it.

Technical processing status (queued, processing, completed, failed), call outcome, and staff ticket status (pending review, in progress, resolved) are independent concepts. Call history includes *all* calls; the staff work queue includes only actionable tickets. AI resolution rate will use a documented denominator and exclude incomplete/unknown calls from its numerator; it is a caller-confirmed demo outcome, **not clinically validated resolution**.

When tickets are introduced, default operational priority will be `NORMAL`; authorized staff may later change it. Ordering is explicit priority first, then oldest original arrival timestamp. No AI-generated clinical urgency or severity scoring. Human review and source transcript comparison are planned before staff approval. A structured AI suggestion is not a human-approved summary.

## AI and processing boundaries (planned)

A backend AI-provider interface will allow a deterministic mock now and another provider later. The provider will suggest structured nonclinical details, validated by the backend; it must not write arbitrary tickets, diagnose, prescribe, or determine medical urgency. Caller confirmation, not LLM self-assessment, determines the simulated `AI_RESOLVED` outcome. Mock processing may run synchronously initially. It is **not** a reliable background job system: production processing would need persisted jobs, timeouts, retries, idempotency, crash recovery, and progress reporting. Processing jobs are infrastructure work, separate from the staff work queue.

## Security and operational limitations

Only fictional information belongs in this prototype. Local DB credentials are demonstration-only. There is no authentication, authorization, audit trail, encrypted recording storage, data retention policy, or regulatory assessment. Do not expose this app to real patient traffic. The API does not log transcripts because there are no transcripts yet; future routes must avoid logging sensitive request bodies. Do not commit secrets.
