# ADR 0003: Data Model and Allocation Rules

- Status: Proposed
- Date: 2026-06-08
- Owner: Product/Engineering

## Context

ADR 0001 defines Vibe Plan as a stage-centric NPI build planning platform. ADR
0002 selects Next.js, Neon Postgres, and Drizzle ORM as the first implementation
stack.

ADR 0003 defines the first persistent data model and allocation rules for the
core planning workflow:

1. Create a project.
2. Define build stages.
3. Collect functional team demand.
4. Map demand into structured config profiles.
5. Allocate build qty to profiles.
6. Map profiles into process/material build matrix entries.
7. Track changes without blocking early NPI iteration.

The data model must be structured enough for analysis, audit, and AI assistance,
but flexible enough for early NPI plans where profile attributes, build goals,
and material/process assumptions can change frequently.

## Decision

Use a `Relational Core + JSON Extensions` model in Postgres.

Core planning objects should be first-class relational tables:

- `projects`
- `build_stages`
- `functional_team_demands`
- `config_profiles`
- `demand_profile_mappings`
- `build_qty_allocations`
- `build_matrix_entries`
- `allocation_change_logs`

Flexible or evolving attributes should use JSON extension fields where a stable
relational shape is not yet justified.

Allocation should be live-editable in the first product version. The system will
not enforce a draft/proposed/approved baseline workflow in ADR 0003. Instead,
allocation changes must be traceable through field-level change logs.

## Schema Boundaries

### Relational Core

Use relational fields for data needed by filtering, joining, reporting,
authorization, audit, and allocation math.

Core relational fields include:

- Project identity, owner, status, and lifecycle timestamps.
- Build stage identity, project relationship, name, goal, order, and template
  source.
- Functional team demand team, purpose, requested qty, priority, owner, and
  stage relationship.
- Config profile structural fields used for uniqueness and allocation grouping.
- Demand-to-profile mapping contribution qty, weight, and rationale.
- Build qty allocation profile relationship, allocated qty, and rationale.
- Build matrix process route and key material variant.
- Change log actor, field, before/after values, reason, and timestamp.

### JSON Extensions

Use JSON extension fields for data that is important but still expected to vary
by customer, product line, or future ADR.

Allowed JSON extension fields:

- `projects.context`: business context, external identifiers, and project-level
  metadata.
- `build_stages.override_data`: template overrides that are not yet stable
  schema fields.
- `functional_team_demands.attributes`: team-specific demand details.
- `config_profiles.extra_attributes`: profile dimensions beyond the structural
  key.
- `build_matrix_entries.context`: process/material assumptions, references, or
  notes that are not yet first-class fields.
- `ai_source` or `proposal_ref`: references to AI-generated suggestions, with
  full AI proposal schema deferred to ADR 0004.

JSON fields must not replace the relational fields required for qty allocation,
stage filtering, profile uniqueness, or audit.

## Core Tables

### projects

Stores the top-level planning container.

Required fields:

- `id`
- `name`
- `description`
- `owner_user_id`
- `status`
- `context`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

`name` and `description` are sufficient for first-run project creation.

### build_stages

Stores project-specific NPI build stages.

Required fields:

- `id`
- `project_id`
- `name`
- `goal`
- `description`
- `stage_order`
- `template_source`
- `override_data`
- `status`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

Stages are ordered within a project. Template values may be copied into the
stage and then overridden per project.

### functional_team_demands

Stores x-function team build qty requests.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `team`
- `purpose`
- `requested_qty`
- `priority`
- `owner_user_id`
- `notes`
- `attributes`
- `ai_source`
- `proposal_ref`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

`requested_qty` must be non-negative. Team names are configurable and should not
be hard-coded to a fixed list.

### config_profiles

Stores structured buildable profiles within a build stage.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `product_revision`
- `test_purpose`
- `market_or_region`
- `variant`
- `process_variant`
- `material_variant`
- `extra_attributes`
- `ai_source`
- `proposal_ref`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

Config profile uniqueness is stage-scoped. Within one build stage, the
structural key is:

```text
build_stage_id
+ product_revision
+ test_purpose
+ market_or_region
+ variant
+ process_variant
+ material_variant
```

If the same structural key appears in another build stage, it is treated as a
separate profile because demand, qty, matrix, and follow-up can differ by stage.

### demand_profile_mappings

Stores the many-to-many relationship between functional team demand and config
profiles.

Required fields:

- `id`
- `functional_team_demand_id`
- `config_profile_id`
- `contribution_qty`
- `weight`
- `rationale`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

One demand can contribute to multiple profiles. One profile can aggregate
multiple demands. `contribution_qty` records the quantity contribution from the
demand to the profile. `weight` is optional when a team or planner wants to
record relative priority or proportional mapping.

### build_qty_allocations

Stores the live-editable quantity assigned to a config profile.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `config_profile_id`
- `allocated_qty`
- `rationale`
- `status`
- `ai_source`
- `proposal_ref`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

There should be at most one active allocation per config profile in a build
stage. `allocated_qty` must be non-negative.

`status` should represent operational state such as active, on hold, or
superseded. It should not imply an approved baseline workflow in ADR 0003.

### build_matrix_entries

Stores process/material mapping for allocated config profiles.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `config_profile_id`
- `build_qty_allocation_id`
- `build_process_route`
- `key_material_variant`
- `context`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

The first matrix depth is process plus material. Full BOM, ERP, MES, and PLM
integration are outside ADR 0003 and should be handled by later ADRs.

### allocation_change_logs

Stores field-level audit records for allocation changes.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `build_qty_allocation_id`
- `actor_user_id`
- `changed_field`
- `before_value`
- `after_value`
- `reason`
- `created_at`

The first version must log changes to at least:

- `allocated_qty`
- `config_profile_id`
- `rationale`
- `status`
- active source demand/profile mappings that materially change allocation
  explanation

`before_value` and `after_value` can be stored as JSON to preserve values across
strings, numbers, enums, and structured fields.

## Allocation Rules

### Demand to Profile Mapping

Functional team demand is input evidence. It does not directly become the build
plan.

Rules:

- A demand may map to zero profiles while it is still being triaged.
- A demand may map to multiple profiles when the requested units need to be
  split across configurations.
- A profile may aggregate multiple demands from one or more teams.
- Each mapping should record `contribution_qty` and `rationale`.
- The sum of mapping contribution qty for one demand may differ from
  `requested_qty`, but the system should warn when it does.

This model preserves traceability without forcing early NPI teams into hard
equal allocation rules.

### Profile to Allocation

Rules:

- Each active config profile should have zero or one active build qty
  allocation.
- Allocations are live-editable by authorized planners.
- `allocated_qty` may differ from mapped demand contribution total.
- The system should warn when allocation qty differs from the total mapped
  contribution qty for that profile.
- Mismatches should remain allowed when the planner provides or preserves a
  rationale.

This supports fast planning changes while keeping visible explanations for
differences between requested, mapped, and allocated qty.

### Allocation to Matrix

Rules:

- A build matrix entry should reference a config profile and, when available,
  its active build qty allocation.
- A profile may have no matrix entry while process/material mapping is still in
  progress.
- A profile may have multiple matrix entries if one profile requires multiple
  process routes or material variants.
- The system should warn when an allocated profile has no matrix entry.

ADR 0003 does not require the matrix to validate full BOM availability or MES
execution readiness.

## Validation and Warning Rules

Use warnings instead of hard blocks for early NPI quantity mismatches.

Required warnings:

- Demand contribution total does not equal `requested_qty`.
- Profile allocation qty does not equal mapped contribution total.
- Allocated profile has no build matrix entry.
- Duplicate active config profile structural key is attempted within the same
  build stage.
- Active allocation is attempted for an archived or deleted profile.

Hard validation should apply only to basic integrity:

- Required relationships must exist.
- Quantities cannot be negative.
- Active duplicate config profile structural keys are not allowed within one
  build stage.
- At most one active allocation can exist for one config profile.
- Deleted or archived records cannot be used as active allocation targets.

## Soft Delete and History Retention

Core planning objects should use soft delete or archive fields.

Objects using `archived_at` and/or `deleted_at`:

- `projects`
- `build_stages`
- `functional_team_demands`
- `config_profiles`
- `demand_profile_mappings`
- `build_qty_allocations`
- `build_matrix_entries`

Soft-deleted records should be excluded from active planning views by default
but remain available for audit, reporting, and recovery workflows.

Change logs should not be soft-deleted in normal product workflows.

## AI References

ADR 0003 does not define the full AI proposal schema.

Domain tables may include `ai_source` or `proposal_ref` when a record was
created or modified from an AI suggestion. These fields should be references,
not the source of the complete AI audit trail.

ADR 0004 will define AI proposal payloads, review state, audit requirements, and
provider interaction rules.

## Alternatives Considered

### Fully Relational Model

Every profile dimension, override, process, material, and attribute could be
normalized into separate tables. This would provide strong governance and
reporting consistency but would slow the first implementation and make early NPI
variation harder to absorb.

Deferred until real usage shows which fields deserve promotion from JSON
extensions to relational fields.

### JSON-First Flexible Model

Most planning objects could be stored as JSON documents. This would be fast to
adapt, but it would weaken allocation math, uniqueness checks, audit, reporting,
and AI context quality.

Rejected because qty allocation and matrix mapping need relational traceability.

### Draft/Proposed/Approved Allocation Workflow

Allocations could move through a formal approval baseline workflow. This would
improve governance but adds friction before the planning model is proven.

Deferred. ADR 0003 chooses live editing plus field-level change logs for the
first version.

### Hard Equality Between Demand and Allocation

The platform could require demand qty, mapped contribution qty, and allocated
qty to match exactly. This would keep totals tidy but does not fit early NPI
planning, where build constraints and planning judgment often change the final
allocation.

Rejected in favor of warning-based mismatch handling.

## Consequences

Positive:

- Core planning data is queryable, auditable, and suitable for AI context.
- JSON extension fields keep the first schema flexible.
- Many-to-many demand/profile mapping captures real NPI split and merge cases.
- Live allocation editing keeps planner workflow fast.
- Field-level change logs preserve accountability without a heavy approval
  workflow.

Tradeoffs:

- Warning-based validation requires disciplined UI design so mismatches remain
  visible.
- JSON extension fields can become messy if promoted fields are not periodically
  reviewed.
- Live-edit allocation lacks formal baseline approval until a later ADR adds
  that workflow.
- Field-level audit adds implementation work to every allocation mutation path.

## Review Scenarios

Use these scenarios to check whether the ADR remains aligned with the intended
platform:

- A project can contain multiple ordered build stages.
- A build stage can contain multiple functional team demands.
- One demand can be split across multiple config profiles with separate
  contribution qty and rationale.
- One config profile can aggregate demand from multiple teams.
- Duplicate active config profiles with the same structural key are rejected
  within one build stage.
- The same structural profile can exist independently in two different build
  stages.
- A planner can edit allocation qty directly and the system records a field-level
  change log.
- Allocation total can differ from mapped demand total, but the system surfaces
  a warning.
- An allocated profile without a matrix entry surfaces a warning.
- Archived or deleted records do not appear in active planning views but remain
  available for audit.
- AI-created or AI-assisted records can reference an AI proposal without ADR
  0003 defining the full AI audit schema.

## Follow-Up ADRs

- ADR 0004: AI agent protocol and audit model.
- ADR 0005: Build matrix and process/material mapping.
- ADR 0006: Schedule and Gantt extension model.
- ADR 0007: Readiness, Greenlight, At Risk, and Blocked semantics.
- ADR 0008: Background jobs, notifications, and long-running AI workflows.

