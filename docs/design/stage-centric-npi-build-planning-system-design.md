# Stage-Centric NPI Build Planning System Design

- Date: 2026-06-08
- Source ADRs: ADR 0001 through ADR 0007
- Product spec: `docs/specs/stage-centric-npi-build-planning-platform.md`

## System Shape

Vibe Plan starts as a single Next.js App Router application with explicit
server-only boundaries for database, authorization, domain rules, and AI
provider calls. The first implementation favors a cohesive monolith so product
work can move quickly while keeping seams clear enough for later packages,
workers, or service extraction.

## Runtime Architecture

```text
Browser
  -> Next.js App Router pages and client form components
  -> Server Actions / Route Handlers
  -> Server-only domain services
  -> Drizzle ORM
  -> Postgres

Server-only domain services
  -> Auth/session helper
  -> Planning rules
  -> AI provider adapter
  -> Audit/change-log writers
```

The core write path is:

1. Client or server component submits form data.
2. Server action validates with `lib/validation`.
3. Server action loads authenticated user context with `lib/auth`.
4. Server action calls `lib/domain` service.
5. Domain service enforces project/stage scope and writes through Drizzle.
6. Domain service returns domain records or expected warnings.
7. Server action revalidates the workspace route and returns expected UX state.

## Repository Boundaries

Current repository layout:

- `app/`: Next.js route tree, pages, route-local server actions.
- `components/ui/`: reusable UI primitives.
- `components/planning/`: planning-specific interactive components.
- `db/schema/`: Drizzle schema and exported table types.
- `db/migrations/`: generated SQL migrations.
- `db/client.ts`: server-only DB client.
- `lib/auth/`: Clerk session and authorization helpers.
- `lib/domain/`: server-only domain services and planning rules.
- `lib/ai/`: AI provider interfaces and provider factory.
- `lib/env/`: typed environment loading.
- `lib/validation/`: shared Zod input schemas.
- `docs/adr/`: architectural decisions.
- `docs/specs/`: product-facing specs.
- `docs/design/`: system designs.
- `docs/superpowers/plans/`: executable implementation plans.

## Data Model Layers

### Implemented Core

- `projects`
- `build_stages`
- `functional_team_demands`
- `config_profiles`
- `demand_profile_mappings`
- `build_qty_allocations`
- `allocation_change_logs`

These tables prove the request-to-allocation loop and support soft delete,
partial unique constraints, non-negative qty checks, and field-level allocation
change logs.

### Build Matrix Layer

Next schema slice:

- `build_matrix_entries`

Initial fields:

- `project_id`
- `build_stage_id`
- `config_profile_id`
- `build_qty_allocation_id`
- `build_process_route`
- `key_material_variant`
- `process_owner_team`
- `material_owner_team`
- `readiness_status`
- `notes`
- `ai_source`
- `proposal_ref`
- lifecycle timestamps and soft delete fields

Future ADR 0005 depth can add process route templates, route instance steps,
BOM snapshots, BOM components, and matrix rows when process/material detail
requires it.

### AI Proposal Layer

Next schema slice:

- `ai_agents`
- `ai_runs`
- `ai_proposals`
- `ai_operations`
- `ai_audit_events`

AI operations are domain operations, not raw database patches. The first
operation set should cover summary/report, conflict check, create/update config
profile proposal, create/update allocation proposal, and create/update matrix
entry proposal.

### Schedule Layer

Future schema slice:

- `schedule_tasks`
- `schedule_task_links`
- `schedule_dependencies`
- `schedule_worklogs`
- `schedule_audit_logs`

Every schedule task must link to at least one NPI planning object. Dates are
manually maintained; the system warns about dependency conflicts and delay risk
instead of auto-rescheduling.

### Readiness Layer

Future schema slice:

- `readiness_signals`
- `readiness_rollups`
- `blockers`
- `readiness_signoffs`
- `readiness_audit_logs`

Readiness is separate from task execution status. Rollups follow worst-child
semantics with manual override reason required.

## Domain Rules

Current rules:

- Project reads and writes are scoped to the current owner user.
- Active build stages exclude soft-deleted rows.
- Active config profile structural key is unique within one build stage.
- Active allocations allow at most one active row per config profile.
- Demand/profile mappings must stay within one build stage.
- Requested qty, contribution qty, mapping weight, and allocated qty are
  non-negative.
- Demand/profile mismatch creates a warning, not a blocking error.
- Allocation/profile mismatch creates a warning, not a blocking error.
- Allocation create/update writes change logs for changed fields.

Planned rules:

- Matrix entries must reference active project, stage, profile, and allocation
  records.
- Matrix readiness values are limited to Greenlight, At Risk, and Blocked.
- AI proposals cannot mutate approved baseline data without human review.
- Schedule tasks must have at least one active planning-object link.
- Readiness signals must attach to valid active planning objects.
- Blocked readiness should have at least one open blocker unless manually
  overridden with a reason.

## AI Integration

The app already has a provider-agnostic AI boundary in `lib/ai`. The next design
step is to add planning-level orchestration:

- `PlanningCopilot`: prepares bounded context and asks the provider for a
  domain proposal.
- `AIAgentProposalStore`: persists runs, proposals, operations, and audit events.
- `AIOperationValidator`: validates proposed operations against domain schemas
  before persistence or application.

DeepSeek can be used through the OpenAI-compatible adapter during development.
Product code should not call DeepSeek or OpenAI directly.

## UX Architecture

The workspace should stay dense and work-focused:

- Project list and project detail.
- Build stage navigation.
- Demand, profile, mapping, allocation, and matrix sections.
- Warning and audit side panels.
- AI proposal review panel.
- Schedule/readiness tabs once those extensions exist.

Client components should own pending/success/error states and local form
ergonomics. Server actions should own validation, mutation, expected error
mapping, and route revalidation.

## Verification Strategy

- Unit/domain tests: planning warnings, allocation change log rows, schedule
  dependency warnings, readiness rollups.
- DB tests: partial unique indexes, soft-delete exclusion, foreign key scope,
  non-negative qty checks.
- Browser walkthrough: project, stage, demand, profile, mapping, allocation,
  warning, change log, then matrix/readiness as those slices land.
- Build gates: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, and
  `pnpm build`.

## Implementation Sequence

1. Land Ticket 5.1 domain rule tests.
2. Add Ticket 5.2 browser walkthrough verification.
3. Add build matrix MVP schema, services, UI, warnings, and tests.
4. Add AI proposal/audit MVP with human disposition.
5. Add readiness/blocker MVP for matrix and stage rollup.
6. Add schedule task/link/dependency MVP and later Gantt visualization.
7. Add baseline confirmation and richer project/stage roles.
