# MVP v0.1 Implementation Tickets

- Date: 2026-06-08
- Scope: Project Init -> Build Stage -> Functional Team Demand -> Config
  Profile -> Demand/Profile Mapping -> Build Qty Allocation -> Build Matrix ->
  AI Proposal/Audit -> Readiness/Blocker -> Schedule Extension -> Warning +
  Change Log
- Source ADRs: ADR 0001 through ADR 0007

## Milestone 0: App Foundation

### Ticket 0.1: Scaffold the Web App

Goal: Create the first runnable Next.js App Router application.

Scope:

- Initialize Next.js with TypeScript, App Router, ESLint, Tailwind, and pnpm.
- Keep the repository as a single app at the repository root.
- Preserve existing `docs/adr` files.

Acceptance:

- `pnpm dev` starts the app locally.
- `pnpm lint` runs.
- The root page renders without runtime errors.

### Ticket 0.2: Establish Project Layout

Goal: Add the directory structure defined by ADR 0002.

Scope:

- Add `components/ui`.
- Add `components/planning`.
- Add `db/schema`.
- Add `db/migrations`.
- Add `lib/auth`, `lib/domain`, `lib/ai`, `lib/env`, and `lib/validation`.

Acceptance:

- Directories exist with lightweight placeholder modules or `.gitkeep` files.
- No business logic is placed directly in page components.

### Ticket 0.3: Configure Environment Validation

Goal: Provide a safe baseline for required runtime configuration.

Scope:

- Define server-side environment loading for Clerk, Neon, and OpenAI keys.
- Keep public env vars explicit.
- Document local `.env.local` expectations.

Acceptance:

- Missing required env values fail with a clear server-side error.
- No secret values are exposed to client components.

## Milestone 1: Auth and Database

### Ticket 1.1: Integrate Clerk Auth

Goal: Protect the application shell and expose user/org identity to server-side
domain services.

Scope:

- Add Clerk provider and middleware.
- Create protected app routes under an authenticated route group.
- Add server-side auth helper in `lib/auth`.

Acceptance:

- Unauthenticated users cannot access app workspace routes.
- Server-side actions can read current user and organization context.

### Ticket 1.2: Integrate Neon Postgres and Drizzle

Goal: Establish typed database access and migrations.

Scope:

- Add Drizzle ORM and Drizzle Kit.
- Configure Neon Postgres connection.
- Add `db/client.ts`.
- Add initial schema modules.

Acceptance:

- Drizzle config can generate migrations.
- Server-only modules can import the DB client.
- DB client is not importable from client components.

## Milestone 2: Core Planning Schema

### Ticket 2.1: Implement Projects and Build Stages Schema

Goal: Create the first relational tables for Project Init and Build Stage.

Scope:

- Add `projects`.
- Add `build_stages`.
- Include lifecycle fields, soft delete/archive fields, and project/stage
  ownership fields.

Acceptance:

- Migration creates project and build stage tables.
- Build stages are ordered within a project.
- Project can be created with name and description.

### Ticket 2.2: Implement Demand/Profile/Allocation Schema

Goal: Model the core allocation workflow.

Scope:

- Add `functional_team_demands`.
- Add `config_profiles`.
- Add `demand_profile_mappings`.
- Add `build_qty_allocations`.
- Add `allocation_change_logs`.

Acceptance:

- Demand can map to multiple profiles.
- Profile can aggregate multiple demands.
- Active config profile structural key is unique within one build stage.
- At most one active allocation exists per config profile.
- Allocation change logs support before/after JSON values.

## Milestone 3: Domain Services

### Ticket 3.1: Project and Stage Services

Goal: Implement server-only domain services for project and stage lifecycle.

Scope:

- Create project.
- List projects.
- Create build stage from explicit fields.
- Edit build stage name, goal, description, order, and status.

Acceptance:

- Services enforce auth context and project scope.
- Page/server actions call services rather than DB queries directly.

### Ticket 3.2: Demand and Profile Services

Goal: Implement demand intake and structured profile creation.

Scope:

- Create functional team demand.
- Create config profile.
- Map demand to profile with contribution qty, weight, and rationale.
- Detect demand mapping mismatch warnings.

Acceptance:

- One demand can split across multiple profiles.
- One profile can aggregate multiple demands.
- Negative quantities are rejected.
- Mismatch warnings are returned but do not block save.

### Ticket 3.3: Allocation Services and Change Logs

Goal: Implement live-edit allocation with audit.

Scope:

- Create allocation for config profile.
- Edit allocated qty, rationale, status, and profile linkage where allowed.
- Record field-level allocation change logs.
- Detect allocation/profile mismatch warnings.

Acceptance:

- Allocation can be edited without a baseline workflow.
- Every key allocation edit writes a change log.
- Warning data is available to UI without blocking save.

## Milestone 4: MVP Planning Workspace

### Ticket 4.1: App Shell and Navigation

Goal: Create a usable authenticated workspace shell.

Scope:

- Project list.
- Project detail route.
- Build stage navigation.
- Empty states for first-run use.

Acceptance:

- User can create a project and navigate to its stages.
- Empty state offers the next primary action.

### Ticket 4.2: Stage Planning Workspace

Goal: Create the first working planning surface for one build stage.

Scope:

- Demand table.
- Config profile table.
- Demand/profile mapping editor.
- Allocation table.
- Warning panel.
- Change log view.

Acceptance:

- User can complete the v0.1 workflow from demand to allocation.
- Warnings are visible and non-blocking.
- Allocation change logs are visible.

### Ticket 4.3: Form Validation and UX States

Goal: Make the first workflow reliable enough for dogfooding.

Scope:

- Add validation messages for required fields and non-negative quantities.
- Add loading, success, and error states for server actions.
- Preserve form state on validation failure where practical.

Acceptance:

- Invalid submissions produce clear messages.
- Successful actions update the workspace without full manual refresh.

## Milestone 5: Verification

### Ticket 5.1: Unit Tests for Domain Rules

Goal: Test the rules most likely to regress.

Scope:

- Structural key uniqueness.
- Demand/profile mapping mismatch.
- Allocation/profile mismatch.
- Change log creation.
- Soft-delete exclusion from active queries.

Acceptance:

- Tests can run locally.
- Rules are tested without rendering UI.

### Ticket 5.2: MVP Walkthrough Test

Goal: Verify the first end-to-end workflow.

Scope:

- Create project.
- Create stage.
- Add team demand.
- Create config profile.
- Map demand to profile.
- Create/edit allocation.
- Confirm warning and change log display.

Acceptance:

- The workflow works in a local browser.
- Any required env or DB setup is documented.

Implementation note: MVP walkthrough verification starts with a DB-backed
fixture test that creates Project -> Stage -> Demand -> Profile -> Mapping ->
Allocation records. A later browser automation layer can reuse the same fixture
to assert rendered warnings and audit state.

## Milestone 6: Build Matrix MVP

### Ticket 6.1: Process and Material Matrix Entries

Goal: Map allocated config profiles into the first build matrix shape required
by ADR 0001 and ADR 0005.

Scope:

- Add `build_matrix_entries`.
- Link matrix entries to project, build stage, config profile, and build qty
  allocation.
- Capture build process route, key material variant, owner teams, readiness,
  and notes.
- Show matrix entries in the project workspace.
- Allow one active matrix entry per allocation, with soft-delete based
  recreation later.

Acceptance:

- An allocated profile can be mapped to process route and key material variant.
- Matrix entries require active allocations.
- Greenlight, At Risk, and Blocked readiness states can be stored.
- Duplicate active matrix entries for the same allocation are rejected.

Implementation note: Completed in `db/schema/index.ts`,
`db/migrations/0003_reflective_molly_hayes.sql`,
`lib/domain/projects.ts`, `lib/domain/build-matrix-rules.ts`,
`app/workspace/actions.ts`, `components/planning/action-forms.tsx`,
`app/workspace/projects/[projectId]/page.tsx`, and
`tests/domain/build-matrix-rules.test.ts`.

## Milestone 7: AI Proposal and Audit MVP

### Ticket 7.1: Planning Copilot Proposal Records

Goal: Persist AI-generated planning proposals without allowing AI to approve or
silently mutate baseline-impacting records.

Scope:

- Add `ai_agents`, `ai_runs`, `ai_proposals`, `ai_operations`, and
  `ai_audit_events`.
- Add a Planning Copilot service that can create a stage summary proposal from
  current project planning records.
- Add project workspace UI for AI proposal generation and human disposition.
- Preserve source context, rationale, confidence, operation payload, and review
  audit data.

Acceptance:

- AI proposals are created as pending review records.
- Human users can accept, reject, or revise proposals.
- Accepted means reviewed, not automatically applied.
- Proposal operations remain pending unless a future explicit apply path is
  implemented.

Implementation note: Completed in `db/schema/index.ts`,
`db/migrations/0004_glorious_tomorrow_man.sql`,
`lib/domain/ai-proposals.ts`, `lib/domain/planning-copilot.ts`,
`app/workspace/actions.ts`, `components/planning/action-forms.tsx`,
`app/workspace/projects/[projectId]/page.tsx`, and
`tests/domain/ai-proposals.test.ts`.

## Milestone 8: Readiness and Blocker MVP

### Ticket 8.1: Readiness Signals, Rollups, and Blockers

Goal: Add the ADR 0007 readiness model so project, stage, matrix, and later
schedule objects can express Greenlight, At Risk, and Blocked state with
actionable blocker follow-up.

Scope:

- Add `readiness_signals`, `readiness_rollups`, `blockers`,
  `readiness_signoffs`, and `readiness_audit_logs`.
- Add worst-child readiness rollup rules.
- Add blocked-signal-without-active-blocker warning.
- Add project workspace UI for readiness signals and blockers.
- Keep readiness state independent from schedule task execution status.

Acceptance:

- Readiness can be attached to project, build stage, or matrix entry objects.
- Stage summary rolls up matrix readiness and readiness signal state.
- Blockers capture owner team, severity, impact, due date, decision-needed
  state, and mitigation.
- Accepted risk blockers remain visible and auditable.

Implementation note: Completed in `db/schema/index.ts`,
`db/migrations/0005_plain_dorian_gray.sql`, `lib/domain/readiness.ts`,
`lib/domain/readiness-rules.ts`, `app/workspace/actions.ts`,
`components/planning/action-forms.tsx`,
`app/workspace/projects/[projectId]/page.tsx`, and
`tests/domain/readiness.test.ts`.

## Milestone 9: Schedule Extension MVP

### Ticket 9.1: Schedule Tasks, Links, Dependencies, and Warnings

Goal: Add the ADR 0006 schedule extension foundation before full Gantt
visualization.

Scope:

- Add `schedule_tasks`, `schedule_task_links`, `schedule_dependencies`,
  `schedule_worklogs`, and `schedule_audit_logs`.
- Require every schedule task to have at least one active planning-object link.
- Add finish-to-start dependency conflict detection.
- Add project workspace UI for schedule task and dependency creation.
- Keep schedule task status independent from readiness state.

Acceptance:

- A schedule task can be tied to a project, stage, profile, allocation, matrix
  row, readiness signal, or blocker.
- Dependency warnings are visible without auto-rescheduling.
- A blocked task does not automatically mutate linked readiness status.

Implementation note: Completed in `db/schema/index.ts`,
`db/migrations/0006_nostalgic_the_renegades.sql`,
`lib/domain/schedule.ts`, `lib/domain/schedule-rules.ts`,
`app/workspace/actions.ts`, `components/planning/action-forms.tsx`,
`app/workspace/projects/[projectId]/page.tsx`, and
`tests/domain/schedule.test.ts`.

## Milestone 10: Final Verification

Final verification on branch `codex/adr-spec-design-plan`:

- `pnpm test`: 20 tests passed.
- `pnpm test:e2e`: 1 test passed.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed.

Deferred beyond MVP v0.1:

- Formal baseline confirmation workflow.
- Full visual Gantt chart and critical path UI.
- Readiness checklist templates and mandatory gate signoff governance.
- Project/stage role model beyond current owner-based access.
- Explicit AI operation apply workflow for baseline-impacting mutations.
