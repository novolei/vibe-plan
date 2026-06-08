# ADR 0001: NPI Build Planning Web Platform

- Status: Proposed
- Date: 2026-06-08
- Owner: Product/Engineering

## Context

Vibe Plan will be a web platform for planning and tracking NPI build work. In
this ADR, NPI means New Product Introduction: the cross-functional process that
turns an early product/program into planned engineering, validation, pilot, and
production build events.

The platform should help teams replace spreadsheet-heavy planning with a shared
system of record for build plans, material readiness, engineering changes,
risks, approvals, and day-by-day execution status.

The first design goal is not to model every manufacturing detail. The first
goal is to make build planning structured, auditable, and easy to adjust when
program assumptions change.

## Decision

Build Vibe Plan as a role-aware web application centered on a versioned
`BuildPlan` domain model. A build plan contains phases, build events, product
configuration, quantity targets, site ownership, readiness checkpoints, risks,
and approvals.

The MVP should optimize for:

- One canonical plan per product/program revision.
- Structured planning data instead of free-form spreadsheet tabs.
- Fast comparison between planned, committed, and actual build state.
- Explicit change history for schedule, quantity, configuration, and owner
  changes.
- Review flows that make cross-functional signoff visible.

## Product Scope

### Primary Users

- Program Manager: owns plan creation, timeline, quantity targets, and status.
- Manufacturing/Operations: owns site capacity, build readiness, and execution
  updates.
- Engineering: owns product configuration, validation needs, and issue closure.
- Supply Chain: owns material readiness, supplier constraints, and risk inputs.
- Quality/Reliability: owns qualification gates, test coverage, and release
  criteria.
- Leadership/Stakeholder: consumes milestone status, risk summaries, and
  decision records.

### Core Workflows

- Create a new NPI program and build plan.
- Define build phases such as EVT, DVT, PVT, Pilot, and MP ramp.
- Add build events with dates, sites, quantities, configurations, and owners.
- Track material, tooling, fixture, test, firmware, and quality readiness.
- Capture risks, blockers, mitigations, decisions, and approval status.
- Compare plan revisions and explain why changes happened.
- Export or share a plan snapshot for review.

### Out of Scope for MVP

- Full ERP/MES replacement.
- Real-time factory execution control.
- Detailed inventory accounting.
- Automated supplier commit management.
- Complex portfolio optimization across all programs.

## Domain Model

The initial domain should use the following entities:

- `Program`: product or project container.
- `ProductRevision`: hardware/software/configuration revision under planning.
- `BuildPlan`: versioned plan for one program and product revision.
- `BuildPhase`: EVT/DVT/PVT/Pilot/MP or team-defined phase.
- `BuildEvent`: dated build activity with site, quantity, configuration, and
  ownership.
- `ReadinessChecklist`: structured readiness gates for a phase or build event.
- `ReadinessItem`: material/tooling/test/quality/firmware/action item.
- `Risk`: risk, blocker, or dependency with severity, owner, mitigation, and
  due date.
- `DecisionRecord`: explicit decision tied to a plan, phase, event, or risk.
- `Approval`: signoff request and response from a role or person.
- `PlanRevision`: immutable snapshot of meaningful build plan changes.
- `Comment`: discussion thread on plan objects.
- `Attachment`: linked evidence such as files, URLs, or exported reports.

## Application Modules

### Planning Workspace

The main workspace should show a timeline/table hybrid:

- Left side: phase and build event hierarchy.
- Main area: schedule, quantity, site, configuration, readiness, and risk state.
- Right side or detail drawer: selected event details, comments, decisions, and
  approval history.

### Readiness Dashboard

The readiness dashboard should summarize each phase and build event by:

- Material readiness.
- Tooling and fixture readiness.
- Test and validation readiness.
- Firmware/software readiness.
- Quality/reliability gates.
- Open risks and critical blockers.

### Change Review

Every meaningful change to dates, quantities, sites, configurations, gates, or
approvals should create a plan revision entry. Users should be able to compare:

- Current plan vs previous revision.
- Proposed plan vs approved baseline.
- Planned quantity vs actual reported quantity.

### Executive View

Leadership-facing views should prioritize:

- Next milestones.
- Red/yellow/green status by phase.
- Critical risks.
- Pending decisions.
- Baseline drift since last approved plan.

## Technical Direction

Use a modern TypeScript web stack with clear separation between UI, API, and
domain logic.

Recommended starting shape:

- Frontend/app framework: Next.js or equivalent React-based full-stack
  framework.
- Language: TypeScript.
- Styling/UI: Tailwind CSS plus a small component system.
- Database: PostgreSQL.
- ORM/query layer: Prisma, Drizzle, or a similarly typed data access layer.
- Authentication: role-aware auth with organization/workspace membership.
- Background jobs: lightweight queue for exports, notifications, and imports.
- File storage: object storage abstraction for attachments and exports.
- Deployment: container-friendly app deployment with managed PostgreSQL.

The implementation should keep domain rules in shared service modules rather
than burying them in page components. Build plan revisioning, approval
requirements, and readiness status calculations should be testable without
rendering the UI.

## Permission Model

Permissions should be organization and program scoped.

Initial roles:

- Admin: manage organization, users, roles, and global settings.
- Program Owner: create/edit plans, submit changes, request approvals.
- Functional Owner: edit assigned readiness items, risks, and status.
- Approver: approve or reject plan baselines and major changes.
- Viewer: read plans, dashboards, and exported snapshots.

MVP should support simple role-based access control first. Attribute-based
rules, delegation, and fine-grained per-field controls can be added later if
real usage requires them.

## Plan Revision Rules

The platform should distinguish normal field edits from baseline-impacting
changes.

Baseline-impacting changes include:

- Build event date changes.
- Quantity target changes.
- Build site changes.
- Product configuration or revision changes.
- Gate criteria changes.
- Approval state changes.

When a baseline-impacting change happens, the system should record:

- Who changed it.
- What changed.
- Previous value and new value.
- Reason or linked decision.
- Whether re-approval is required.

## Integration Strategy

Start with import/export before deep integrations.

MVP integrations:

- CSV/XLSX import for initial plans.
- CSV/XLSX export for stakeholder review.
- Shareable read-only snapshot links.

Later integrations:

- ERP/MRP material status.
- MES actual build output.
- PLM/BOM revision data.
- Slack/Teams notifications.
- Jira/Linear issue links.

## Alternatives Considered

### Spreadsheet-First Tooling

The team could build spreadsheet templates plus scripts. This would be fast but
would keep ownership, approvals, and change history fragmented.

Rejected for MVP because the platform's main value is a shared, auditable system
of record.

### Generic Project Management Model

The team could model everything as tasks, milestones, and comments. This would
be simpler but would miss NPI-specific concepts such as build phases, quantities,
readiness gates, product revisions, and build baselines.

Rejected because the product should feel native to NPI build planning.

### Deep ERP/MES Integration First

The team could start by connecting to manufacturing systems. This may be
important later, but it raises implementation risk before the core planning
model is proven.

Deferred until after the MVP validates plan authoring, readiness tracking, and
baseline review.

## Consequences

Positive:

- The platform has a clear product center: versioned NPI build plans.
- MVP can deliver value without waiting for deep enterprise integrations.
- Auditability and approvals are built into the model from the start.
- Domain logic can be tested independently from the UI.

Tradeoffs:

- Initial data entry may feel heavier than a spreadsheet.
- The team must define practical defaults for phases, readiness gates, and
  approval policies.
- Import/export quality matters because early adoption will likely begin from
  existing spreadsheets.

## First Implementation Slice

1. Initialize the web app scaffold.
2. Add authentication and workspace/program membership.
3. Implement `Program`, `ProductRevision`, `BuildPlan`, `BuildPhase`, and
   `BuildEvent`.
4. Build the planning workspace with create/edit/list flows.
5. Add plan revision history for baseline-impacting changes.
6. Add basic readiness checklist support.
7. Add CSV/XLSX export for plan snapshots.

## Follow-Up ADRs

- ADR 0002: Web framework, deployment, and repository layout.
- ADR 0003: Data model and plan revisioning rules.
- ADR 0004: Authentication, organization model, and authorization.
- ADR 0005: Import/export format for NPI build plans.
- ADR 0006: Readiness scoring and executive status semantics.

