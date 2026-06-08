# Stage-Centric NPI Build Planning Platform Product Spec

- Date: 2026-06-08
- Source ADRs: ADR 0001 through ADR 0007
- Current implementation baseline: `main` at `e61e511`

## Purpose

Vibe Plan is a web platform for planning and following NPI build work by build
stage. It is not a generic project management tool. The product center is the
stage-level path from project initialization to functional demand, structured
config/profile allocation, process/material build matrix mapping, AI-assisted
planning review, and later schedule/readiness follow-up.

## Users

- Program owner: creates projects, defines build stages, confirms baselines,
  and reviews cross-functional tradeoffs.
- Planner: converts team demand into config profiles, qty allocations, matrix
  rows, schedule tasks, readiness signals, and blocker follow-up.
- Functional team requester: submits build qty demand for a specific stage and
  provides purpose, priority, owner, and notes.
- Readiness owner: owns Greenlight, At Risk, or Blocked state for matrix,
  schedule, material, process, or stage gates.
- Reviewer or approver: reviews AI proposals, allocation changes, readiness
  signoffs, and baseline decisions.

## Product Principles

- Stage first: every planning object is anchored to a project and build stage.
- Structured planning over tags: config/profile dimensions are first-class
  fields before free-text labels.
- Request then allocate: team demand is input evidence; allocation is the
  planning decision.
- Human baseline authority: AI can draft, analyze, summarize, and propose, but
  human disposition confirms baseline-impacting changes.
- Extensible core: schedule, Gantt, readiness, blockers, BOM, and AI protocols
  attach to the same core objects without rewriting project/stage/allocation
  data.

## Core Workflow

1. Program owner creates a project with name and description.
2. Program owner creates build stages such as EVT, DVT, and PVT from templates
   or explicit fields.
3. Functional teams submit demand for a build stage.
4. Planner creates structured config profiles using product revision, test
   purpose, market or region, variant, process variant, and material variant.
5. Planner maps one or more demand records into one or more profiles with
   contribution qty, weight, and rationale.
6. Planner allocates build qty to each profile and preserves allocation change
   history.
7. Planner maps allocated profiles into process/material build matrix entries.
8. AI Planning Copilot proposes cleanups, allocations, matrix rows, conflict
   checks, readiness summaries, and report drafts.
9. Human users accept, reject, revise, or apply AI proposals according to
   proposal status and audit rules.
10. Schedule, Gantt, readiness, and blockers attach to the same project, stage,
    allocation, and matrix records as extension capabilities.

## MVP v0.1 Scope

MVP v0.1 proves the first planning loop:

- Project creation.
- Build stage creation.
- Functional team demand intake.
- Config profile creation.
- Demand/profile mapping.
- Build qty allocation.
- Non-blocking planning warnings for demand/profile and allocation/profile
  mismatches.
- Allocation change log display.
- Form validation and expected error UX.
- Domain rule tests and browser walkthrough verification.

## ADR-Backed Expansion Scope

### Build Matrix

Build matrix MVP adds `build_matrix_entries` that link a project, build stage,
config profile, and allocation to:

- `build_process_route`
- `key_material_variant`
- `process_owner_team`
- `material_owner_team`
- `readiness_status`
- `notes`

The first implementation should not model full BOM, ERP, MES, or route-step
execution. It must let the planner express which process route and key material
variant make an allocated profile buildable.

### AI Agent Protocol

AI agent MVP adds durable proposal records:

- `ai_agents`
- `ai_runs`
- `ai_proposals`
- `ai_operations`
- `ai_audit_events`

The first UI should support a planning summary proposal and a matrix conflict
check proposal. AI output must remain draft/proposal data until a human reviews
it. Baseline-impacting changes cannot be silently applied by AI.

### Schedule and Gantt Extension

Schedule MVP adds task records tied to NPI objects:

- `schedule_tasks`
- `schedule_task_links`
- `schedule_dependencies`
- `schedule_worklogs`
- `schedule_audit_logs`

The first user-facing slice should be a schedule task list tied to build stages
and matrix rows. Gantt visualization can start as structured data and dependency
warnings before a full visual chart.

### Readiness and Blockers

Readiness MVP adds:

- `readiness_signals`
- `readiness_rollups`
- `blockers`
- `readiness_signoffs`
- `readiness_audit_logs`

The first user-facing slice should show Greenlight, At Risk, and Blocked state
on build matrix entries and stage rollups. Blockers must capture owner, impact,
due date or decision needed, and mitigation.

## Current Implementation Status

Implemented on `main`:

- Next.js App Router application scaffold.
- Clerk auth integration and protected workspace.
- Local Postgres/Neon-compatible Drizzle setup.
- Projects and build stages schema, migrations, services, and UI.
- Functional demands, config profiles, demand/profile mappings, allocations,
  allocation change logs, services, and UI.
- Planning warnings for demand/profile and allocation/profile mismatch.
- Form validation, loading states, success states, and expected error handling.
- AI provider boundary with OpenAI-compatible and DeepSeek-ready configuration.

Implemented on branch `codex/ticket-5-1-domain-tests`:

- Node test runner setup.
- Domain rule tests for planning warnings and allocation change log rows.
- DB-backed tests for structural key uniqueness and soft-delete exclusion.

Not implemented yet:

- Build matrix schema and UI.
- Durable AI proposal/audit schema and review UI.
- Schedule/Gantt schema and UI.
- Readiness/blocker schema and UI.
- MVP browser walkthrough automation.
- Baseline confirmation workflow.
- Project/stage role model beyond current owner-based access.

## Acceptance Scenarios

- A user can create a project with only name and description, then enter stage
  planning.
- A user can create EVT/DVT/PVT-like stages and override name, goal, and
  description.
- EE, SW/FW, MFG, Quality, and other configured teams can submit demand for a
  stage.
- A planner can map multiple demands into one profile or split one demand
  across multiple profiles.
- Each config profile can receive a build qty allocation.
- The system warns when mapped demand differs from requested qty.
- The system warns when allocated qty differs from mapped profile demand.
- Allocation edits write human-readable change log rows.
- Each allocated profile can be mapped to a process route and material variant.
- AI can create proposals with source context, rationale, confidence, and
  review disposition.
- Readiness can represent Greenlight, At Risk, or Blocked without changing task
  execution status.
- Future Gantt/readiness features attach to project, stage, profile,
  allocation, matrix, schedule, and blocker objects through extension links.

## Non-Goals

- Replace PLM, ERP, MES, BOM master data, procurement execution, or inventory
  accounting.
- Build a generic project management product detached from NPI planning objects.
- Let AI approve or silently mutate approved baseline data.
- Implement full Gantt auto-rescheduling in the first schedule slice.
- Require heavy readiness checklist governance before readiness patterns are
  validated.
