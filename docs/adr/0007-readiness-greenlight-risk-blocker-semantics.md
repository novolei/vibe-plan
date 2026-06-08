# ADR 0007: Readiness, Greenlight, At Risk, and Blocked Semantics

- Status: Proposed
- Date: 2026-06-08
- Owner: Product/Engineering

## Context

ADR 0001 reserves readiness, Greenlight, At Risk, and Blocked semantics for the
NPI build planning platform. ADR 0005 adds local process/material readiness
fields to build matrix rows. ADR 0006 keeps task status separate from readiness
status while allowing tasks to link to readiness and blockers.

ADR 0007 defines the global readiness model used across project, stage, demand,
profile, allocation, matrix, schedule, and BOM planning objects.

The goal is to make readiness visible and actionable without turning every
status update into a heavy approval workflow.

## Decision

Use a `ReadinessSignal + Blocker` model.

`ReadinessSignal` expresses whether a planning object is ready to proceed.
`Blocker` captures the concrete issue, owner, impact, due date, and mitigation
when readiness is at risk or blocked.

Readiness signals can attach to any core planning object. Rollups should use
`Worst child rolls up`: if a child object is Blocked, the parent is at least
Blocked; if a child is At Risk, the parent is at least At Risk. Manual override
is allowed but must include a reason.

Greenlight can optionally require signoff by a readiness owner for critical
gates. AI may analyze and propose readiness signals or blockers, but key gate
confirmation remains human-controlled.

## Readiness Semantics

Use three global readiness states:

- `Greenlight`: ready to proceed.
- `At Risk`: not blocked yet, but active follow-up is required.
- `Blocked`: cannot proceed without mitigation or a decision.

These states describe planning readiness, not task execution progress. A task
can be in progress while a linked readiness signal is At Risk. A task can be
done while the broader stage readiness remains Blocked due to another issue.

## Core Tables

### readiness_signals

Stores readiness state for a linked planning object.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `linked_object_type`
- `linked_object_id`
- `status`
- `summary`
- `owner_user_id`
- `due_date`
- `source_type`
- `source_ref`
- `manual_override_status`
- `manual_override_reason`
- `signed_off_status`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

`linked_object_type` should support project, build stage, functional team
demand, config profile, build qty allocation, build matrix row, process route
step, BOM component, schedule task, schedule dependency, blocker, or future
execution objects.

`source_type` can identify whether the signal came from manual input, matrix
readiness, schedule analysis, AI proposal, blocker rollup, imported data, or a
future integration.

### readiness_rollups

Stores computed readiness rollups for parent planning objects.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `parent_object_type`
- `parent_object_id`
- `computed_status`
- `child_signal_count`
- `greenlight_count`
- `at_risk_count`
- `blocked_count`
- `manual_override_status`
- `manual_override_reason`
- `computed_at`
- `updated_at`

Rollups should be recomputable. The stored row is a query optimization and audit
aid, not the only source of truth.

### blockers

Stores concrete blockers or risks tied to readiness.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `linked_object_type`
- `linked_object_id`
- `readiness_signal_id`
- `title`
- `description`
- `status`
- `severity`
- `impact_dimensions`
- `owner_user_id`
- `due_date`
- `mitigation`
- `decision_needed`
- `accepted_risk_reason`
- `resolved_at`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

Blocker lifecycle states:

- `open`
- `mitigating`
- `resolved`
- `accepted_risk`

`accepted_risk` means the blocker is not fully resolved, but the accountable
team has decided to proceed with known risk.

Recommended severity values:

- `critical`
- `high`
- `medium`
- `low`

Recommended impact dimensions:

- `schedule`
- `quantity`
- `material`
- `process`
- `quality`
- `cost`
- `scope`

### readiness_signoffs

Stores optional readiness owner signoff for critical gates.

Required fields:

- `id`
- `readiness_signal_id`
- `signoff_required`
- `signoff_status`
- `requested_by_user_id`
- `requested_at`
- `signed_off_by_user_id`
- `signed_off_at`
- `rejected_by_user_id`
- `rejected_at`
- `reason`
- `created_at`
- `updated_at`

Recommended signoff states:

- `not_required`
- `requested`
- `signed_off`
- `rejected`
- `revoked`

Signoff should be optional. Routine readiness updates should not require
signoff, but key stage gates or critical matrix readiness can require it.

### readiness_audit_logs

Stores field-level readiness audit records.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `readiness_signal_id`
- `readiness_rollup_id`
- `blocker_id`
- `readiness_signoff_id`
- `actor_type`
- `actor_id`
- `changed_field`
- `before_value`
- `after_value`
- `reason`
- `created_at`

Audit logs should cover readiness status, manual override, blocker lifecycle,
severity, impact dimensions, owner, due date, mitigation, accepted risk reason,
and signoff changes.

## Rollup Rules

Readiness rollups use `Worst child rolls up`.

Rules:

- Any active child Blocked signal makes the parent rollup Blocked.
- If no active child is Blocked but at least one child is At Risk, the parent
  rollup is At Risk.
- If all active children are Greenlight, the parent rollup is Greenlight.
- Archived or deleted child signals are excluded from active rollups.
- Manual override can set a different parent status, but requires a reason.
- Manual override should be visible in UI and audit logs.

Rollups should not silently overwrite a human signoff record. If a signed-off
Greenlight later receives a Blocked child signal, the rollup should surface the
conflict and require follow-up.

## Blocker Rules

Blockers are independent objects that can drive readiness state.

Rules:

- An open or mitigating critical blocker should produce or maintain a Blocked
  readiness signal unless manually overridden with a reason.
- An open lower-severity blocker may produce At Risk or Blocked depending on
  impact.
- A resolved blocker should no longer keep readiness Blocked.
- An accepted risk should usually roll up as At Risk unless a readiness owner
  explicitly Greenlights with signoff.
- Blockers must have an owner and impact dimension.
- Critical blockers should have a due date or decision-needed flag.

## Schedule and Task Relationship

Readiness and schedule tasks are linked but not auto-mutating.

Rules:

- A readiness signal or blocker may link to one or more schedule tasks.
- A Blocked readiness signal may suggest creating a task.
- A blocked task may suggest creating a blocker.
- The system must not automatically change task status from readiness state.
- The system must not automatically change readiness state from task status.

This preserves the distinction established in ADR 0006: task status describes
work execution, readiness describes planning risk.

## AI Readiness Operations

AI may analyze and propose readiness signals or blockers.

Allowed AI outputs:

- Readiness risk analysis from matrix rows, schedule tasks, worklogs, blockers,
  and comments.
- Proposed readiness status changes.
- Proposed blocker creation or updates.
- Suggested mitigation summary.
- Suggested signoff question or gate review summary.

AI should not auto-confirm critical Greenlight gates. Human readiness owners
must confirm or sign off key gates.

AI proposals must follow ADR 0004:

- Domain operations, not raw database patches.
- Permission checks.
- Baseline and approved-state protection.
- Audit events.
- Human review for critical readiness decisions.

## Validation Rules

Hard validation:

- Readiness signal must link to a valid planning object.
- Blocker must link to a valid planning object.
- Blocker must have owner, severity, and at least one impact dimension.
- Signoff record must link to a readiness signal.
- Archived or deleted objects cannot receive active readiness signals.
- Manual override requires a reason.

Warning validation:

- Blocked signal has no blocker.
- Critical blocker has no due date and no decision-needed flag.
- Greenlight is set while active child objects remain Blocked.
- Accepted risk is set without mitigation or accepted risk reason.
- Signoff requested but owner is missing.
- Readiness status conflicts with linked matrix readiness or schedule risk.

Warnings should remain visible in readiness dashboards and stage summaries.

## Alternatives Considered

### Checklist-Driven Readiness

The platform could make readiness a checklist engine where each object has
required checklist items and readiness rolls up from item completion. This would
provide strong governance but adds heavier setup and maintenance before the team
has validated readiness patterns.

Deferred. Checklist templates can be added later on top of readiness signals and
blockers.

### Status Field Only

Each object could store only a readiness status field. This would be fast to
implement but would lose blocker ownership, mitigation, due dates, impact
analysis, signoff, and audit detail.

Rejected because NPI readiness needs actionable follow-up.

### Manual Rollup Only

All readiness rollups could be manually set by planners. This gives maximum
control but makes dashboards and stage summaries less trustworthy.

Rejected in favor of worst-child automatic rollup with manual override.

### Task Status Drives Readiness

Readiness could be derived from schedule task status. This is simple, but it
mixes execution progress with planning risk and conflicts with ADR 0006.

Rejected. Tasks and readiness remain linked but independent.

## Consequences

Positive:

- Readiness has clear global semantics across planning objects.
- Blockers are actionable because they have owner, severity, impact, due date,
  mitigation, and lifecycle.
- Worst-child rollup supports trustworthy dashboards and stage summaries.
- Manual override preserves planner judgment while requiring accountability.
- Optional signoff supports critical gates without overloading every update.
- Task/readiness separation keeps schedule execution and planning risk clear.

Tradeoffs:

- Rollup logic and override visibility require careful UI design.
- Readiness can attach to many object types, so linking and filtering must be
  consistent.
- Accepted risk requires cultural discipline so it does not become a way to hide
  blockers.
- Field-level audit adds implementation work to all readiness mutations.

## Review Scenarios

Use these scenarios to check whether the ADR remains aligned with the intended
platform:

- A matrix row can have a readiness signal and a linked blocker.
- A schedule task can link to a blocker without its task status changing
  automatically.
- A build stage rolls up to Blocked when any active child readiness signal is
  Blocked.
- A build stage rolls up to At Risk when no child is Blocked but at least one
  child is At Risk.
- A planner can manually override a rollup only with a reason.
- A readiness owner can sign off a critical Greenlight gate.
- A critical blocker requires owner, severity, impact, and due date or decision
  needed.
- A resolved blocker no longer keeps readiness Blocked.
- An accepted risk remains visible and auditable.
- AI can propose readiness changes or blockers but cannot auto-confirm critical
  Greenlight signoff.
- Field-level audit records status, blocker, owner, due date, severity, impact,
  override, accepted risk, and signoff changes.

## Follow-Up ADRs

- ADR 0008: Background jobs, notifications, and long-running AI workflows.
- ADR 0010: Actual execution import and schedule variance reporting.
- ADR 0011: Readiness checklist templates and gate governance.

