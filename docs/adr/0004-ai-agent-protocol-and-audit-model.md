# ADR 0004: AI Agent Protocol and Audit Model

- Status: Proposed
- Date: 2026-06-08
- Owner: Product/Engineering

## Context

ADR 0001 defines AI as a planning copilot for the stage-centric NPI build
planning platform. ADR 0002 requires a provider-agnostic AI adapter with OpenAI
as the first default provider. ADR 0003 reserves `ai_source` and `proposal_ref`
fields in domain tables but defers the full AI proposal and audit schema.

ADR 0004 defines how AI agents create recommendations, propose structured domain
operations, apply authorized changes, and preserve auditability.

The system must support broad AI collaboration without allowing silent changes
to approved or baselined planning data.

## Decision

Use a broad copilot action protocol backed by durable AI proposal and audit
tables.

The AI Agent may generate structured domain operations for:

- Project creation or update.
- Build stage creation or update.
- Functional team demand cleanup or creation.
- Config profile suggestion or update.
- Build qty allocation suggestion or update.
- Build matrix entry creation or update.
- Planning conflict detection.
- Stage, allocation, matrix, or readiness summary/report generation.

The AI Agent can auto-apply authorized operations against draft/live working
data when its application role has permission. The AI Agent must not
auto-apply changes to baseline or approved planning data. Baseline or approved
changes can only be proposed and must be applied by a human reviewer.

## Protocol Model

### AI Provider Boundary

Product code should call the internal planning copilot protocol, not a provider
SDK directly.

Required internal layers:

- `AIProvider`: low-level model adapter.
- `PlanningCopilot`: domain-aware orchestration for context selection,
  operation generation, validation, and persistence.
- `AIAgentProposalStore`: persistence boundary for runs, proposals, operations,
  and audit events.

OpenAI is the first default provider, but the persisted protocol should not
depend on OpenAI-specific response shapes.

### Run, Proposal, Operation

Use three levels of AI output:

- `ai_run`: one invocation of an AI agent against a specific context.
- `ai_proposal`: a reviewable group of suggested or auto-applied work produced
  by a run.
- `ai_operation`: one structured domain action inside a proposal.

Operations should be domain operations, not raw database patches.

Examples:

- `create_project`
- `update_project`
- `create_build_stage`
- `update_build_stage`
- `create_functional_team_demand`
- `update_functional_team_demand`
- `create_config_profile`
- `update_config_profile`
- `update_build_qty_allocation`
- `create_build_matrix_entry`
- `update_build_matrix_entry`
- `flag_conflict`
- `generate_summary`

Each operation should include:

- `operation_type`
- `target_type`
- `target_id`, when updating an existing object
- `input_payload`
- `rationale`
- `confidence`
- `validation_status`
- `execution_status`
- `error_message`, when validation or execution fails

## Review and Execution States

### Proposal State

`ai_proposals` should support:

- `pending`: generated and awaiting review or auto-apply.
- `accepted`: human accepted the proposal but not all operations are applied.
- `rejected`: human rejected the proposal.
- `revised`: human edited the proposal or operation payload before apply.
- `applied`: all applicable operations were applied.
- `partially_applied`: some operations applied and some remain pending or
  failed.
- `failed`: no operation could be applied successfully.

### Operation State

`ai_operations` should support:

- `pending`
- `validated`
- `rejected`
- `revised`
- `applied`
- `failed`
- `skipped`

The system should distinguish review from execution. A user can accept or revise
an operation before it is actually applied.

### Human Apply

When a human applies an AI operation:

- The system must check the human reviewer's application permissions.
- The operation should execute as the human reviewer for audit purposes.
- The operation should reference the proposal and operation that caused the
  domain change.
- Domain tables may set `ai_source` or `proposal_ref` to that operation or
  proposal.

### Agent Auto-Apply

When an AI Agent auto-applies an operation:

- The system must check the AI agent's application role and permissions.
- The operation should execute as the AI agent actor.
- The operation must not modify baseline or approved planning data.
- The operation must pass domain validation before persistence.
- The operation and resulting domain changes must write audit events.

Allowed auto-apply examples:

- Create draft summary/report records.
- Flag conflicts.
- Create draft demand cleanup suggestions.
- Create draft config profiles or matrix entries in non-baseline working data,
  if the AI agent role is explicitly granted that permission.

Not allowed for auto-apply:

- Modify baseline or approved project/stage/allocation/matrix data.
- Delete or archive core planning data.
- Change human review disposition.
- Override allocation change logs.
- Apply operations that fail schema, domain, or authorization validation.

## Permission Model

AI agents should be represented as first-class application actors.

Required actor concepts:

- Human user actor.
- AI agent actor.
- System actor for migrations or maintenance tasks.

AI agents have their own application roles and permissions. These permissions
should be narrower than admin permissions by default.

Permission rules:

- Auto-apply uses AI agent permissions.
- Human apply uses human reviewer permissions.
- Baseline or approved data changes always require human apply.
- AI agents cannot grant themselves permissions.
- AI agents cannot change their own role.
- AI agents cannot bypass project, stage, or organization scoping.

## Audit Model

Use structured audit rather than raw prompt storage by default.

The system should record:

- Structured input object references.
- Context summary used for the run.
- Provider and model identity.
- Tool or operation schema version.
- Generated operations.
- Validation results.
- Review decisions.
- Apply actor.
- Apply result.
- Error and retry events.

The system should not store full raw prompt text or full raw model responses by
default. Raw capture can be introduced later behind explicit security and
retention controls.

## Core AI Tables

### ai_agents

Stores AI agent actors and their application-level permissions.

Required fields:

- `id`
- `name`
- `description`
- `provider`
- `model`
- `status`
- `role`
- `permission_scope`
- `created_at`
- `updated_at`
- `archived_at`

### ai_runs

Stores one AI invocation.

Required fields:

- `id`
- `ai_agent_id`
- `trigger_actor_type`
- `trigger_actor_id`
- `project_id`
- `build_stage_id`
- `run_type`
- `provider`
- `model`
- `context_summary`
- `input_refs`
- `status`
- `started_at`
- `completed_at`
- `error_message`

`input_refs` should reference domain objects used as context rather than copying
all source content into the run.

### ai_proposals

Stores a reviewable group of AI operations.

Required fields:

- `id`
- `ai_run_id`
- `project_id`
- `build_stage_id`
- `proposal_type`
- `title`
- `summary`
- `status`
- `created_by_actor_type`
- `created_by_actor_id`
- `reviewed_by_user_id`
- `reviewed_at`
- `applied_by_actor_type`
- `applied_by_actor_id`
- `applied_at`
- `created_at`
- `updated_at`

`proposal_type` examples include planning update, allocation suggestion, matrix
mapping, conflict report, and stage summary.

### ai_operations

Stores individual domain operations inside a proposal.

Required fields:

- `id`
- `ai_proposal_id`
- `operation_order`
- `operation_type`
- `target_type`
- `target_id`
- `input_payload`
- `rationale`
- `confidence`
- `validation_status`
- `execution_status`
- `review_status`
- `reviewed_by_user_id`
- `reviewed_at`
- `applied_by_actor_type`
- `applied_by_actor_id`
- `applied_at`
- `error_message`
- `created_at`
- `updated_at`

`input_payload` should be structured and versioned enough to validate before
execution.

### ai_audit_events

Stores durable audit events for AI lifecycle actions.

Required fields:

- `id`
- `ai_agent_id`
- `ai_run_id`
- `ai_proposal_id`
- `ai_operation_id`
- `event_type`
- `actor_type`
- `actor_id`
- `event_payload`
- `created_at`

Event types should include:

- `run_started`
- `run_completed`
- `run_failed`
- `proposal_created`
- `proposal_reviewed`
- `operation_validated`
- `operation_revised`
- `operation_applied`
- `operation_failed`
- `auto_apply_blocked`
- `baseline_change_blocked`
- `permission_denied`

## Validation and Execution

AI output must pass validation before it can be stored as an executable
operation or applied to domain data.

Validation layers:

- Schema validation for operation payload shape.
- Domain validation for project/stage/profile/allocation/matrix rules.
- Authorization validation for human or AI agent actor permissions.
- Baseline protection validation.

Execution should be atomic per operation. Each operation runs in its own
transaction. If one operation fails, the proposal can continue to track other
operations as pending, applied, skipped, or failed.

The proposal status should summarize operation outcomes:

- All applied: `applied`.
- Some applied and some pending/failed/skipped: `partially_applied`.
- None applied due to failures: `failed`.

## Baseline Protection

AI auto-apply cannot modify baseline or approved data.

Baseline-protected objects include:

- Approved project stage plan state.
- Approved or baselined build qty allocation.
- Approved matrix mapping.
- Any record explicitly marked approved, baselined, locked, or equivalent by a
  later ADR.

For baseline-protected objects, AI may only generate proposals. A human reviewer
with the required permission must apply the operation.

## Alternatives Considered

### Analysis-Only AI

AI could only generate summaries and conflict reports. This would reduce risk
but would miss the platform's goal of assisting actual NPI planning structure
creation and maintenance.

Rejected because the product needs AI to help with structured planning work, not
only reporting.

### Human-Only Apply

Every AI operation could require a human apply step. This is safest but creates
too much friction for low-risk draft/live working data such as summaries,
conflict flags, or draft cleanup proposals.

Rejected in favor of agent role permissions plus baseline protection.

### Database Row Patch Protocol

AI operations could be represented as direct table and field patches. This would
be generic but would expose database internals, make permissions harder to
understand, and create brittle coupling to schema details.

Rejected in favor of domain operations.

### Raw Prompt and Response Audit

The system could store complete raw prompts and raw model responses. This would
maximize replay/debug detail but creates retention, privacy, and data-volume
risks.

Rejected for default behavior. Structured context summaries and input/output
references are the default audit model.

### Atomic Per Proposal

All operations in one proposal could succeed or fail together. This provides
strong consistency, but large AI proposals would be fragile because one invalid
operation would block all useful operations.

Rejected in favor of atomic per operation execution.

## Consequences

Positive:

- AI can assist broad planning workflows while staying inside clear permission
  boundaries.
- Domain operations are understandable to users and enforceable by application
  authorization rules.
- AI output can be reviewed, revised, applied, or blocked with durable audit
  history.
- Baseline protection preserves trust in approved planning state.
- Operation-level transactions support partial progress without losing audit
  detail.

Tradeoffs:

- AI agent role permissions add security and product complexity.
- Every auto-apply path needs careful validation and audit events.
- Structured audit is safer than raw prompt storage but may be less useful for
  deep model debugging.
- Proposal and operation status handling will require careful UI design.

## Review Scenarios

Use these scenarios to check whether the ADR remains aligned with the intended
platform:

- AI can propose multiple domain operations in one proposal.
- AI operations use business names such as `create_config_profile` and
  `update_build_qty_allocation`, not raw database patches.
- A human reviewer can accept, reject, revise, and apply operations.
- AI can auto-apply authorized draft/live operations when its role permits.
- AI cannot auto-apply changes to baseline or approved data.
- Human apply re-checks the human reviewer's permissions.
- Failed operations do not roll back already applied operations from the same
  proposal.
- Proposal status can show partial application.
- Audit events preserve input references, context summary, provider/model,
  operations, review decisions, apply results, and failures.
- Domain records can reference the proposal or operation that created or
  modified them through `proposal_ref` or equivalent fields.

## Follow-Up ADRs

- ADR 0005: Build matrix and process/material mapping.
- ADR 0006: Schedule and Gantt extension model.
- ADR 0007: Readiness, Greenlight, At Risk, and Blocked semantics.
- ADR 0008: Background jobs, notifications, and long-running AI workflows.

