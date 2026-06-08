# ADR 0005: Build Matrix and Process/Material Mapping

- Status: Proposed
- Date: 2026-06-08
- Owner: Product/Engineering

## Context

ADR 0001 defines the build matrix as the mapping from config/profile allocation
to process and material requirements. ADR 0003 introduces
`build_matrix_entries` as the first persistence boundary for that mapping. ADR
0004 allows AI agents to create or update matrix entries within permission and
baseline-protection rules.

ADR 0005 refines the build matrix into a planning structure detailed enough to
support NPI follow-up: each allocated config/profile can be mapped to process
steps and BOM material items, with readiness fields and future execution hooks.

The build matrix is not intended to replace PLM, ERP, MES, or a full BOM master
system. It stores a planning copy of process/material requirements for a
specific project, build stage, allocation, and profile.

## Decision

Use `Allocation x Process Step x Material Item` as the core build matrix
granularity.

Each matrix row should connect:

- Project.
- Build stage.
- Config profile.
- Build qty allocation.
- Process route step.
- Imported BOM snapshot.
- BOM component or material item.

The platform should use reusable process route templates with stage/allocation
overrides. Material mapping should use imported BOM snapshots. Each config
profile or allocation may bind to its own profile-specific BOM snapshot.

The first version is planned-only. It should define hooks for future actual
build qty, process completion, and material consumption data, but it should not
attempt to become MES or ERP.

## Process Route Model

### Route Templates

`process_route_templates` define reusable process routes.

Required fields:

- `id`
- `name`
- `description`
- `product_family`
- `revision`
- `status`
- `created_at`
- `updated_at`
- `archived_at`

Route templates should be reusable across projects and stages. They represent
planning defaults, not immutable manufacturing master data.

### Route Template Steps

`process_route_template_steps` define ordered steps inside a route template.

Required fields:

- `id`
- `process_route_template_id`
- `step_order`
- `step_code`
- `name`
- `description`
- `operation_type`
- `default_owner_team`
- `default_duration`
- `default_readiness_status`
- `created_at`
- `updated_at`
- `archived_at`

Examples of `operation_type` include assembly, test, inspection, rework,
packout, validation, and reliability.

### Stage or Allocation Route Overrides

Specific build stages or allocations may copy a route template and override
steps.

`process_route_instances` should record:

- `id`
- `project_id`
- `build_stage_id`
- `config_profile_id`
- `build_qty_allocation_id`
- `process_route_template_id`
- `name`
- `override_context`
- `created_at`
- `updated_at`
- `archived_at`

`process_route_instance_steps` should record:

- `id`
- `process_route_instance_id`
- `source_template_step_id`
- `step_order`
- `step_code`
- `name`
- `description`
- `operation_type`
- `owner_team`
- `planned_duration`
- `readiness_status`
- `readiness_owner`
- `readiness_due_date`
- `readiness_notes`
- `created_at`
- `updated_at`
- `archived_at`

Overrides should preserve the source template reference when the step originated
from a reusable template.

## BOM Snapshot Model

### Imported BOM Snapshot

`bom_snapshots` store a planning copy of an imported BOM.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `config_profile_id`
- `build_qty_allocation_id`
- `source_system`
- `source_revision`
- `source_file_name`
- `imported_by_user_id`
- `imported_at`
- `status`
- `metadata`
- `archived_at`

The snapshot is source-traceable, but Vibe Plan is not the master system of
record for the BOM. Future PLM integration can refresh or compare snapshots.

### BOM Components

`bom_snapshot_components` store the component list inside a BOM snapshot.

Required fields:

- `id`
- `bom_snapshot_id`
- `line_number`
- `part_number`
- `description`
- `revision`
- `quantity_per_unit`
- `unit_of_measure`
- `supplier`
- `manufacturer`
- `material_category`
- `is_critical`
- `substitute_group`
- `readiness_status`
- `readiness_owner`
- `readiness_due_date`
- `readiness_notes`
- `metadata`
- `created_at`
- `updated_at`
- `archived_at`

`quantity_per_unit` should support planned requirement math, but ADR 0005 does
not require inventory accounting or procurement execution.

## Build Matrix Rows

`build_matrix_rows` are the main planning rows for process/material mapping.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `config_profile_id`
- `build_qty_allocation_id`
- `process_route_instance_id`
- `process_route_instance_step_id`
- `bom_snapshot_id`
- `bom_snapshot_component_id`
- `planned_build_qty`
- `quantity_per_unit`
- `planned_material_qty`
- `process_readiness_status`
- `process_readiness_owner`
- `process_readiness_due_date`
- `process_readiness_notes`
- `material_readiness_status`
- `material_readiness_owner`
- `material_readiness_due_date`
- `material_readiness_notes`
- `actual_refs`
- `ai_source`
- `proposal_ref`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

`planned_material_qty` should be derived from `planned_build_qty` and
`quantity_per_unit` when possible, while allowing planner override when NPI
scrap, yield, spares, rework, or test needs require a different planning
quantity.

`actual_refs` should hold references to future execution or consumption data.
ADR 0005 does not define those execution records.

## Readiness Fields

ADR 0005 defines local matrix-level readiness fields so teams can follow process
and material preparation before the full readiness workflow exists.

Matrix-level readiness fields:

- `process_readiness_status`
- `process_readiness_owner`
- `process_readiness_due_date`
- `process_readiness_notes`
- `material_readiness_status`
- `material_readiness_owner`
- `material_readiness_due_date`
- `material_readiness_notes`

The first allowed readiness statuses should be lightweight:

- not started
- in progress
- ready
- at risk
- blocked
- not applicable

ADR 0007 will define the global Greenlight, At Risk, Blocked semantics and
blocker workflow. ADR 0005 only defines readiness fields local to process and
material matrix follow-up.

## Actual Execution Hooks

The first build matrix is planned-only.

It should leave reference hooks for future data such as:

- Actual build quantity.
- Process step completion.
- Test result coverage.
- Material consumption.
- Scrap or yield loss.
- MES lot or serial references.
- ERP inventory or purchase references.

These should be represented as references or extension fields until a later ADR
defines execution integration.

## Validation Rules

Use hard validation for required links and warnings for planning mismatches.

Hard validation:

- Matrix row must link to project, build stage, config profile, allocation,
  route instance step, BOM snapshot, and BOM component.
- Matrix row links must belong to the same project and build stage.
- Matrix row allocation must belong to the linked config profile.
- BOM component must belong to the linked BOM snapshot.
- Route instance step must belong to the linked route instance.
- Archived or deleted records cannot be used for active matrix rows.
- Planned quantities cannot be negative.

Warning validation:

- Planned build qty differs from allocation qty.
- Planned material qty differs from `planned_build_qty * quantity_per_unit`.
- BOM snapshot source revision does not match the config profile material
  variant.
- Process route template revision is older than the stage's expected route
  version.
- Process or material readiness is at risk or blocked.
- Critical BOM component has missing readiness owner or due date.
- Allocated profile has no matrix row.

Warnings should not block early NPI planning. They should remain visible in the
matrix workspace and summary/report views.

## AI Matrix Operations

AI agents may propose or auto-apply matrix operations only under ADR 0004 rules.

Supported AI operation types include:

- `create_process_route_instance`
- `update_process_route_instance_step`
- `import_bom_snapshot_summary`
- `create_build_matrix_row`
- `update_build_matrix_row`
- `flag_matrix_conflict`
- `summarize_matrix_readiness`

AI auto-apply may only affect draft/live matrix data when the AI agent role has
permission. AI must not auto-apply changes to baseline or approved matrix data.

AI-generated matrix rows must still satisfy hard validation before persistence.

## Boundaries

Vibe Plan stores planning matrix data.

It does not own:

- PLM master BOM.
- ERP inventory truth.
- MES execution truth.
- Supplier commit truth.
- Full quality system record.

Future integrations may compare, refresh, or link these systems to Vibe Plan
planning records. They should not require replacing the matrix row model.

## Alternatives Considered

### Profile x Process Route x Material Variant

The build matrix could stay at the coarser profile/process/material variant
level. This is simpler, but it cannot express step-level readiness or component
level material planning well enough for NPI follow-up.

Rejected because the platform needs more concrete process/material tracking.

### Stage-Level Matrix

A build stage could own matrix rows without binding to allocation and profile.
This is simpler for stage summaries, but it loses traceability from team demand
to profile allocation to process/material requirements.

Rejected because ADR 0001 and ADR 0003 make allocation/profile traceability a
core platform value.

### Live PLM Reference Only

The platform could avoid storing BOM snapshots and read live PLM data instead.
This would preserve master-data truth but makes the first implementation depend
on external integration and limits planning what-if workflows.

Rejected for the first version. Use imported BOM snapshots as planning copies.

### Full MES/ERP Execution Model

The platform could track actual build execution, material consumption, and
inventory from the start. This would be powerful but would turn the first
implementation into an execution system rather than a planning system.

Rejected. ADR 0005 defines planned data plus future actual hooks.

## Consequences

Positive:

- Matrix rows trace process/material planning back to allocation and profile.
- Imported BOM snapshots support component-level planning without making Vibe
  Plan the PLM master.
- Route templates encourage reuse while overrides preserve NPI flexibility.
- Local readiness fields support follow-up before the full readiness workflow.
- Required links keep matrix data credible while warnings preserve planning
  flexibility.

Tradeoffs:

- Component-level BOM snapshots make the first matrix model more complex.
- Import quality matters because BOM snapshot data drives material planning.
- Readiness fields may later need migration when ADR 0007 formalizes global
  readiness semantics.
- Planning quantities can diverge from allocation and BOM math, so warning UI
  and summaries must be clear.

## Review Scenarios

Use these scenarios to check whether the ADR remains aligned with the intended
platform:

- A planner can create a reusable process route template and copy it into a
  build stage or allocation.
- A planner can override process steps for a specific allocation without losing
  the template reference.
- A planner can import a BOM snapshot for a profile or allocation.
- A matrix row links allocation, process step, BOM snapshot, and BOM component.
- Planned material qty can be derived from planned build qty and quantity per
  unit.
- A planner can override planned material qty with a rationale when NPI planning
  requires spares, scrap, yield, rework, or test extras.
- Missing required links block saving a matrix row.
- Qty mismatch, old route revision, material mismatch, and readiness risk show
  warnings rather than blocking work.
- AI can propose draft matrix rows, route updates, and conflict flags under ADR
  0004 permissions.
- Baseline or approved matrix data cannot be changed by AI auto-apply.
- Future actual execution data can link back through `actual_refs` without
  changing the planned matrix row identity.

## Follow-Up ADRs

- ADR 0006: Schedule and Gantt extension model.
- ADR 0007: Readiness, Greenlight, At Risk, and Blocked semantics.
- ADR 0008: Background jobs, notifications, and long-running AI workflows.
- ADR 0009: BOM import, validation, and PLM comparison workflow.

