# ADR 0001: Stage-Centric NPI Build Planning Platform

- Status: Proposed
- Date: 2026-06-08
- Owner: Product/Engineering

## Context

Vibe Plan will be a web platform for planning and following NPI build work by
stage. In this ADR, NPI means New Product Introduction: the cross-functional
process that turns a project into planned, allocated, and trackable build
activities.

The platform's primary purpose is not generic project management. Its primary
purpose is to help teams define each project's build stages, collect build qty
needs from cross-functional teams, convert those needs into structured
config/profile allocations, and map those profiles into a build matrix covering
process and material requirements.

Many NPI build plans begin in spreadsheets because teams need speed and
flexibility. That model breaks down when demand, allocation, configuration,
process, material readiness, and executive summary views diverge across files.
Vibe Plan should become the shared system of record for stage-level build
planning while leaving room for later schedule, Gantt, readiness, and AI-driven
analysis extensions.

## Decision

Build Vibe Plan as a stage-centric NPI build planning and follow platform. The
core system model is:

1. `Project Init`: define the project name, description, owner, and base
   context.
2. `Build Stage`: define each build stage from a template, then allow
   project-level overrides for name, goal, description, order, and scope.
3. `X-Function Demand`: collect build qty demand from different functional
   teams.
4. `Config/Profile Allocation`: convert team demand into structured
   config/profile records and allocate build qty to each profile.
5. `Build Matrix`: map each config/profile to build process routes and key
   material variants.
6. `AI Planning Copilot`: use AI Agent proposals for planning assistance,
   conflict checks, analysis, and summaries while keeping human confirmation as
   the source of approved baseline truth.
7. `Extension Protocols`: define minimal extension contracts for schedule,
   Gantt, readiness, Greenlight, At Risk, and Blocked semantics without making
   the first version a full schedule/readiness engine.

The first product direction should optimize for clear planning structure,
traceable qty allocation, explicit build matrix mapping, and auditable AI
assistance.

## Product Model

### Project Init

`Project` is the top-level planning container.

Required planning fields:

- `name`: project or product program name.
- `description`: planning context and product intent.
- `owner`: accountable project or program owner.
- `status`: draft, active, baselined, archived, or equivalent lifecycle state.

A project can enter stage planning once the name and description are defined.
More metadata can be added later, but first-run creation should stay lightweight.

### Build Stage

`BuildStage` represents one NPI build stage for a project. It is not only a
calendar event; it is the container for goal, demand, allocation, matrix, and
follow-up state.

Required planning fields:

- `name`: stage name such as EVT, DVT, PVT, Pilot, or a project-specific name.
- `goal`: the business/engineering objective of the stage.
- `description`: operational detail, scope, and constraints.
- `order`: sequence within the project.
- `template_source`: the phase/stage template copied from, if any.
- `project_override`: the set of project-specific changes from the template.

The stage model uses `Template + Override`. The platform should provide default
NPI stage templates, but every project can copy and adjust them.

### Functional Team Demand

`FunctionalTeamDemand` captures build qty needs from x-function teams before
they are normalized into config/profile allocation.

Required planning fields:

- `team`: configurable functional team such as EE, SW/FW, MFG, Quality,
  Reliability, Supply Chain, or another customer-defined team.
- `purpose`: why the team needs units.
- `requested_qty`: requested build quantity.
- `priority`: relative priority or criticality.
- `owner`: responsible requester.
- `notes`: supporting assumptions or constraints.

The platform should treat team demand as input evidence. Demand does not become
the approved build plan until it is mapped into profiles and allocation.

### Config/Profile

`ConfigProfile` is the structured planning object that turns multiple team
requests into buildable configurations.

The first model should be structured rather than tag-only. Candidate fields
include:

- `product_revision`: hardware, software, or combined revision.
- `test_purpose`: validation, reliability, manufacturing trial, customer demo,
  qualification, or other purpose.
- `market_or_region`: region, market, carrier, customer, or regulatory target.
- `variant`: product variant such as color, storage, SKU, module, or feature
  set.
- `process_variant`: manufacturing or test process variant.
- `material_variant`: key material or BOM variant.

Additional notes and optional tags may exist, but the primary matching and
analysis model should rely on structured fields.

### Build Qty Allocation

`BuildQtyAllocation` records the committed or proposed quantity assigned to a
specific config/profile within a build stage.

Required planning fields:

- `config_profile`: target profile receiving the quantity.
- `allocated_qty`: assigned build quantity.
- `source_demands`: the team demand records that drove the allocation.
- `rationale`: explanation for why this allocation exists.
- `approval_status`: draft, proposed, approved, rejected, or superseded.

The allocation workflow is `Request -> Allocate`: teams request qty, the
planner or program owner maps those requests into profiles, then the platform
records explicit qty allocation per profile.

### Build Matrix

`BuildMatrixEntry` maps each config/profile allocation into the build execution
shape required for planning.

The first build matrix depth is `Process + Material`:

- `config_profile`: profile being mapped.
- `build_process_route`: expected build, assembly, test, or validation route.
- `key_material_variant`: material or BOM variant needed to support the
  profile.
- `notes`: matrix assumptions, constraints, or exceptions.

The first version should not attempt to replace ERP, MES, PLM, or a full BOM
system. It must, however, clearly express why a profile needs a specific process
route and which key material variant must be ready.

## Core Workflow

1. A project owner creates a project with name and description.
2. The project owner creates build stages from a default template.
3. The project team overrides stage names, goals, descriptions, order, or scope
   as needed.
4. Functional teams submit demand for a specific build stage.
5. Planner or program owner reviews team demand and groups it into structured
   config/profile records.
6. Planner allocates build qty to each config/profile and links the allocation
   back to source demands.
7. Planner maps each allocated config/profile into the build matrix with process
   route and key material variant.
8. AI Agent may suggest profiles, allocations, matrix conflicts, and summaries.
9. Human owner accepts, rejects, or revises AI proposals.
10. Human owner confirms the stage plan baseline.
11. Later schedule, Gantt, readiness, and blocker tools consume the baseline
    stage, allocation, and matrix data through extension interfaces.

## AI Collaboration Model

AI Agent support should begin as a planning copilot, not an autonomous planning
operator.

The AI Agent may:

- Convert unstructured demand notes into proposed structured demand fields.
- Suggest config/profile grouping from multiple team demands.
- Suggest build qty allocation and explain the rationale.
- Detect conflicts such as over-allocation, missing profiles, duplicated
  demand, inconsistent material variants, or process/material mismatches.
- Summarize stage plans, allocation changes, matrix coverage, and readiness
  concerns.
- Prepare management-facing reports and data analysis.

The AI Agent must not:

- Directly approve a stage baseline.
- Silently modify approved allocation or matrix data.
- Override human disposition, approval, or audit history.
- Become the only source for planning rationale.

`AIAgentProposal` should preserve:

- `proposal_type`: demand cleanup, profile suggestion, allocation suggestion,
  conflict check, summary, or report.
- `source_context`: records and text used to generate the proposal.
- `rationale`: explanation suitable for review.
- `confidence`: model-provided or system-derived confidence signal.
- `human_disposition`: pending, accepted, rejected, or revised.
- `reviewer`: person who made the disposition.
- `reviewed_at`: review timestamp.

Human confirmation remains the source of approved baseline truth.

## Extension Protocols

ADR 0001 defines the minimum interfaces needed to avoid reworking the core model
when schedule, Gantt, and readiness features arrive later.

### Build Schedule

`BuildScheduleItem` should link schedule data to a project, build stage,
config/profile, allocation, matrix entry, or blocker.

Minimum fields:

- `linked_object`: the planning object being scheduled.
- `start_date`: planned start date.
- `end_date`: planned end date.
- `owner`: schedule owner.
- `status`: draft, planned, committed, in progress, completed, or delayed.

### Gantt and Dependencies

`Dependency` should express relationships needed by future Gantt and critical
path views.

Minimum fields:

- `predecessor`: upstream object.
- `successor`: downstream object.
- `dependency_type`: finish-to-start, start-to-start, finish-to-finish, or
  informational.
- `lag_days`: optional lag between predecessor and successor.

### Readiness and Blockers

`ReadinessSignal` should provide a simple, shared status language:

- `Greenlight`: ready to proceed.
- `At Risk`: not blocked yet, but risk needs active follow-up.
- `Blocked`: cannot proceed without mitigation or decision.

`Blocker` should capture:

- `owner`: person or function accountable for resolution.
- `impact`: planning, schedule, quantity, matrix, material, process, quality, or
  other impact.
- `due_date`: expected resolution date.
- `mitigation`: current mitigation or ask.
- `linked_object`: project, stage, demand, allocation, matrix entry, or schedule
  item affected by the blocker.

ADR 0001 does not require a complete readiness engine. It only establishes the
status semantics and linking model for later implementation.

## Alternatives Considered

### Spreadsheet-First Tooling

The team could continue using spreadsheet templates plus manual summaries. This
is fast and familiar, but it keeps team demand, qty allocation, matrix mapping,
and status follow-up fragmented.

Rejected because the platform's main value is a shared, auditable planning
model.

### Generic Project Management Model

The team could model everything as tasks, milestones, and comments. This would
be simple to build but would miss NPI-specific planning concepts such as build
stage goals, x-function qty demand, config/profile allocation, and
process/material matrix mapping.

Rejected because the product should feel native to NPI build planning.

### Matrix Engine First

The team could make the build matrix the top-level model and treat projects and
stages as metadata around it. This would be strong for process/material
planning, but it would make stage-level demand collection and planning follow-up
less intuitive.

Deferred because the product's first organizing principle is the build stage.

### AI-First Autonomous Planning

The team could make AI Agent behavior the primary interface and allow it to
create, modify, and approve plans. This may become useful later for advanced
automation, but it creates audit, trust, and permission risks too early.

Rejected for the first platform direction. AI should assist planning and
analysis while humans confirm approved baseline state.

## Consequences

Positive:

- The platform has a specific NPI planning center: project stages, team demand,
  profile allocation, and build matrix mapping.
- Build qty rationale becomes traceable from team demand through profile
  allocation.
- Structured config/profile data gives the AI Agent and future analytics a
  strong foundation.
- Schedule, Gantt, readiness, and blocker extensions can attach to the core
  planning model without redefining it.

Tradeoffs:

- Initial data modeling is more structured than a spreadsheet.
- Teams must agree on practical stage templates and profile fields.
- AI proposals require review and disposition flows before they can affect
  baseline planning.
- Full ERP, MES, PLM, BOM, and readiness-engine integrations remain later
  phases.

## Review Scenarios

Use these scenarios to check whether the ADR remains aligned with the intended
platform:

- A user can create a project with only name and description, then enter stage
  planning.
- A user can create EVT, DVT, PVT, or project-specific stages from templates and
  override stage name, goal, description, order, or scope.
- EE, SW/FW, MFG, Quality, Reliability, or other configurable teams can submit
  different build qty demand.
- A planner can combine multiple team demands into one or more structured
  config/profile records.
- Every config/profile can receive a clear build qty allocation linked back to
  source team demands.
- Every allocated config/profile can map to a build process route and key
  material variant.
- AI Agent can suggest allocation, detect planning conflicts, and summarize
  stage status.
- A user can accept, reject, or revise AI suggestions, and the platform keeps an
  audit trail.
- Future Gantt and readiness features can consume project, stage, allocation,
  matrix, dependency, schedule, readiness, and blocker interfaces without
  replacing the core planning model.

## Follow-Up ADRs

- ADR 0002: Web framework, deployment, and repository layout.
- ADR 0003: Data model and allocation rules.
- ADR 0004: AI agent protocol and audit model.
- ADR 0005: Build matrix and process/material mapping.
- ADR 0006: Schedule and Gantt extension model.
- ADR 0007: Readiness, Greenlight, At Risk, and Blocked semantics.

