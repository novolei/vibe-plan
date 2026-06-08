# ADR 0002: Web Framework, Deployment, and Repository Layout

- Status: Proposed
- Date: 2026-06-08
- Owner: Product/Engineering

## Context

ADR 0001 defines Vibe Plan as a stage-centric NPI build planning platform. The
first product surface needs to support project/stage planning, x-function
demand, config/profile allocation, build matrix mapping, and AI-assisted
planning workflows.

The repository is currently documentation-only. ADR 0002 chooses the initial web
application stack, deployment model, and repository layout so the first
implementation can start without introducing avoidable platform complexity.

The platform should optimize for fast product iteration, secure authenticated
collaboration, typed access to Postgres data, preview deployments for review,
and a clean path toward later worker, AI, schedule, Gantt, and readiness
extensions.

## Decision

Build the first Vibe Plan application as a Next.js App Router monolith deployed
on Vercel.

Default stack:

- Framework: Next.js App Router.
- Hosting and deployment: Vercel.
- Database: Neon Postgres.
- ORM and migrations: Drizzle ORM.
- Authentication and organization identity: Clerk.
- UI system: Tailwind CSS and shadcn/ui.
- AI integration: provider-agnostic internal adapter with OpenAI as the first
  default provider.
- Package and quality tooling: pnpm, TypeScript, ESLint, and Prettier.

Start with one application in this repository instead of a monorepo. Keep
domain, database, authorization, and AI boundaries explicit so they can later be
extracted into packages or services without rewriting product behavior.

## Application Architecture

### Next.js App Router Monolith

The first application should keep UI routes, server actions, route handlers,
domain services, database access, and AI adapters in one deployable Next.js app.

The App Router should own:

- Page routes and layouts.
- Server components for authenticated planning views.
- Server actions for form-driven mutations.
- Route handlers for API-style integrations, webhooks, and AI proposal calls
  that do not fit naturally into server actions.

Server actions and route handlers should stay thin. They should validate input,
load auth context, call domain services, and return typed results. Business
rules should live outside page components so project/stage planning, qty
allocation, matrix mapping, and AI proposal review can be tested independently
from the UI.

### Server-Only Domain Boundary

The implementation should use server-only modules for sensitive logic:

- Database client and Drizzle schema.
- Domain services for projects, build stages, team demand, allocations, matrix
  entries, and AI proposal disposition.
- Authorization checks that combine Clerk identity with application-level
  project and stage roles.
- AI provider adapters and planning copilot orchestration.

Client components should be used for interactive UI only. They must not import
database clients, secret-bearing AI providers, or authorization internals.

## Repository Layout

Use a single-app layout at first:

```text
/
  app/
    (marketing)/
    (app)/
    api/
  components/
    ui/
    planning/
  db/
    schema/
    migrations/
    client.ts
  lib/
    auth/
    domain/
    ai/
    env/
    validation/
  docs/
    adr/
  drizzle.config.ts
  package.json
  pnpm-lock.yaml
  tsconfig.json
```

Directory responsibilities:

- `app/`: Next.js route tree, layouts, server actions close to their routes, and
  route handlers.
- `components/ui/`: shadcn/ui generated primitives and small shared UI pieces.
- `components/planning/`: reusable planning UI such as stage workspaces,
  allocation tables, matrix editors, drawers, and dashboards.
- `db/`: Drizzle schema, migrations, and database client initialization.
- `lib/auth/`: Clerk integration helpers plus application role checks.
- `lib/domain/`: server-only domain services and planning rules.
- `lib/ai/`: internal AI provider interface, OpenAI adapter, and planning
  copilot orchestration.
- `lib/env/`: typed environment variable loading and validation.
- `lib/validation/`: shared input schemas for actions, route handlers, and
  forms.

This layout keeps the repository simple while leaving a migration path to a
future `apps/web` plus `packages/*` monorepo if reusable packages become
necessary.

## Deployment and Environments

Vercel is the default deployment platform.

Required environments:

- Development: local Next.js app using local `.env.local` values.
- Preview: Vercel preview deployments for branches and pull requests.
- Production: Vercel production deployment from the protected main branch.

Environment variables should be split by deployment environment. Secrets must
stay server-side unless they are intentionally prefixed for safe public client
use. Local development may use Vercel CLI env pull or manually managed
`.env.local`, but secrets should not be committed.

Preview deployments should be used for product review of planning workflows,
especially stage creation, demand intake, allocation, matrix mapping, and AI
proposal review.

## Data Layer

Neon Postgres is the default database for all deployed environments.

Drizzle ORM should provide:

- TypeScript schema definitions.
- SQL migration generation and execution.
- Typed queries from server-only modules.
- A migration history suitable for preview and production environments.

The database layer should use Postgres as the system of record for Vibe Plan
domain data. Clerk remains the identity provider, but application-specific roles
and permissions should be represented in the Vibe Plan database so project,
stage, and planning permissions can evolve independently from Clerk's built-in
organization roles.

## Authentication and Authorization

Clerk is the default authentication and organization identity provider.

Clerk should own:

- User sign-in and sign-up.
- Session management.
- Organization membership and active organization context.
- Basic organization-level identity claims.

Vibe Plan should own:

- Project roles.
- Build stage roles.
- Planner, requester, reviewer, approver, and viewer permissions.
- AI proposal review permissions.
- Audit records for human actions and AI proposal disposition.

Next.js middleware should protect authenticated app routes. Server components,
server actions, and route handlers should still perform server-side auth checks
before reading or mutating domain data.

## UI System

Use Tailwind CSS and shadcn/ui as the default UI foundation.

The first product UI should favor dense, work-focused planning surfaces:

- Stage workspace.
- Functional demand intake forms.
- Allocation tables.
- Config/profile detail drawers.
- Build matrix editor.
- AI proposal review panels.
- Summary dashboards for stage status and follow-up.

shadcn/ui should provide accessible primitives for forms, tables, dialogs,
drawers, tabs, menus, and command surfaces. Product-specific planning components
should live separately from generated UI primitives.

## AI Adapter Model

The application should expose an internal provider-agnostic AI boundary. Product
code should call planning-level interfaces rather than directly calling a model
provider SDK.

Initial internal interfaces:

- `AIProvider`: low-level text or structured generation provider.
- `PlanningCopilot`: domain service that prepares context, calls the provider,
  validates output, and records proposals.
- `AIAgentProposalStore`: persistence boundary for proposal source context,
  rationale, confidence, and human disposition.

OpenAI should be the first default provider implementation. It should be
replaceable without changing project, stage, demand, allocation, or matrix
business logic.

AI calls should run server-side only. AI-generated output should be stored as
draft/proposal data and must require human disposition before changing approved
baseline planning state.

## Alternatives Considered

### Turborepo Monorepo

A monorepo with `apps/web` and `packages/*` would make shared package boundaries
explicit from day one. It is deferred because the repository is currently empty
and the first product milestone benefits more from simple deployment and fast
iteration.

### Container-First Deployment

Render, Fly.io, or a container platform would make self-hosting and background
workers more direct. It is deferred because Vercel preview deployments and
Next.js integration are a better fit for the first web planning platform.

### Enterprise Internal Platform First

An internal Kubernetes or private-cloud design could match later enterprise IT
requirements. It is deferred because it would slow early product discovery and
does not materially improve the first stage planning workflows.

### Provider-Specific AI Calls

Calling OpenAI directly from feature code would be the fastest initial AI path.
It is rejected because ADR 0001 expects AI collaboration to expand over time.
The business layer should depend on a planning copilot interface, not a specific
provider SDK.

## Consequences

Positive:

- The stack is fast to scaffold, deploy, and review.
- Vercel preview deployments support frequent product iteration.
- Neon Postgres and Drizzle provide a typed relational foundation for planning
  data.
- Clerk accelerates authenticated collaboration while leaving business
  permissions in the application.
- A provider-agnostic AI adapter keeps the AI collaboration model extensible.

Tradeoffs:

- Long-running jobs, queues, and scheduled background work may later require a
  worker service or queue provider.
- A single-app repository is simpler now but may need a monorepo split after
  reusable packages emerge.
- Vercel-first deployment creates some platform coupling, especially around
  environment management and serverless execution limits.
- Drizzle gives strong TypeScript control but requires discipline around schema,
  migration, and query organization.

## Review Scenarios

Use these scenarios to check whether the ADR remains aligned with the intended
platform:

- A developer can scaffold one Next.js App Router app and deploy it to Vercel
  without creating multiple services.
- Preview deployments can run against preview-safe environment variables and a
  Neon database target.
- Server actions and route handlers call server-only domain services rather than
  embedding planning rules inside UI components.
- Drizzle migrations define and evolve the Postgres schema for project, stage,
  demand, allocation, matrix, and AI proposal data.
- Clerk protects app routes and provides user/organization context.
- Application-level roles decide who can create stages, submit demand, allocate
  qty, approve baseline changes, and review AI proposals.
- UI primitives can support dense planning workflows without introducing a
  separate design system in the first milestone.
- AI feature code can swap the default OpenAI adapter for another provider
  without rewriting planning domain services.

## Follow-Up ADRs

- ADR 0003: Data model and allocation rules.
- ADR 0004: AI agent protocol and audit model.
- ADR 0005: Build matrix and process/material mapping.
- ADR 0006: Schedule and Gantt extension model.
- ADR 0007: Readiness, Greenlight, At Risk, and Blocked semantics.
- ADR 0008: Background jobs, notifications, and long-running AI workflows.

