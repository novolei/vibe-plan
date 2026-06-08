# ADR 0006: Schedule and Gantt Extension Model

- Status: Proposed
- Date: 2026-06-08
- Owner: Product/Engineering

## Context

ADR 0001 reserves schedule and Gantt extension interfaces for NPI build planning.
ADR 0005 adds process-step and material-item matrix detail, which creates the
need for task-level follow-up, dependencies, worklogs, and delay analysis.

ADR 0006 defines a full task management and Gantt model for Vibe Plan while
keeping every task tied to NPI planning objects. The goal is not to become a
generic project management or billing timesheet tool. The goal is to support NPI
build plan follow-up, accountability, dependency analysis, and timeline risk
visibility.

## Decision

Use a full task management system with Gantt dependencies, worklogs, and
field-level audit.

Every schedule task must link to at least one NPI planning object, such as:

- Project.
- Build stage.
- Config profile.
- Build qty allocation.
- Build matrix row.
- Process route step.
- BOM component.
- Readiness signal.
- Blocker.

Tasks may have one subtask level. Unlimited WBS nesting is out of scope.

Dates are manually maintained. The system should analyze dependency conflicts,
delay risk, and critical path warnings, but it should not automatically reschedule
the plan.

## Core Tables

### schedule_tasks

Stores the main schedule task and subtask records.

Required fields:

- `id`
- `project_id`
- `build_stage_id`
- `parent_task_id`
- `title`
- `description`
- `task_type`
- `status`
- `priority`
- `owner_user_id`
- `assignee_user_id`
- `planned_start_date`
- `planned_end_date`
- `actual_start_date`
- `actual_end_date`
- `completed_at`
- `duration_days`
- `progress_percent`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

`parent_task_id` may point to another task, but only one subtask level is
allowed. A subtask cannot have its own child tasks.

Recommended task statuses:

- `todo`
- `in_progress`
- `done`
- `blocked`
- `canceled`

### schedule_task_links

Stores links between tasks and NPI planning objects.

Required fields:

- `id`
- `schedule_task_id`
- `linked_object_type`
- `linked_object_id`
- `link_role`
- `created_at`
- `archived_at`

Every task must have at least one active link. `linked_object_type` should cover
project, build stage, allocation, config profile, matrix row, process step, BOM
component, readiness signal, blocker, or future execution objects.

### schedule_dependencies

Stores Gantt dependency relationships.

Required fields:

- `id`
- `project_id`
- `predecessor_task_id`
- `successor_task_id`
- `dependency_type`
- `lag_days`
- `created_by_user_id`
- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`

Supported dependency types:

- `finish_to_start`
- `start_to_start`
- `finish_to_finish`
- `start_to_finish`

`lag_days` may be positive, zero, or negative where planning policy allows
overlap.

### schedule_worklogs

Stores execution follow-up notes and effort records for NPI tasks.

Required fields:

- `id`
- `schedule_task_id`
- `user_id`
- `work_date`
- `duration_minutes`
- `summary`
- `blocker_note`
- `created_at`
- `updated_at`
- `deleted_at`

Worklogs exist for build plan follow-up, delay analysis, and accountability.
They are not intended for billing, payroll, or HR timekeeping.

### schedule_audit_logs

Stores field-level schedule audit records.

Required fields:

- `id`
- `project_id`
- `schedule_task_id`
- `schedule_dependency_id`
- `schedule_worklog_id`
- `actor_user_id`
- `changed_field`
- `before_value`
- `after_value`
- `reason`
- `created_at`

Audit logs should cover task dates, owner, assignee, status, priority,
dependency changes, and worklog changes.

## Gantt and Date Model

The Gantt view should be generated from `schedule_tasks` and
`schedule_dependencies`.

Rules:

- Users manually maintain planned start and end dates.
- Users may record actual start, actual end, and completion dates.
- The system should not auto-reschedule tasks.
- The system should warn when dependencies conflict with dates.
- The system should identify possible critical path risks.
- The system should surface overdue tasks and dependency-driven delay risk.

Example warning cases:

- A successor starts before a finish-to-start predecessor ends.
- A task is blocked and sits on a critical dependency chain.
- Actual end date exceeds planned end date.
- A predecessor task is late and successor work has not started.
- A task has worklogs but no actual start date.

## Readiness and Blocker Relationship

Task status and readiness status are separate concepts.

Task status describes work execution. Readiness and blockers describe planning
or launch risk. Tasks can link to readiness signals or blockers through
`schedule_task_links`, but task status should not automatically determine
readiness status.

ADR 0007 will define global readiness semantics for Greenlight, At Risk, and
Blocked.

## Permission Model

Use owner and role based editing.

Rules:

- Task owner and assignee can update task status, progress, actual dates, and
  worklogs.
- Planner or program owner can create tasks, adjust planned dates, change
  dependencies, and reassign ownership.
- Viewer can read schedule and Gantt data but cannot edit.
- Critical changes should write field-level audit logs.

Project and stage level role checks should still apply before task-specific
permissions.

## AI Schedule Operations

AI may analyze schedule data and generate proposals, but it should not
auto-apply schedule or Gantt changes in ADR 0006.

Allowed AI outputs:

- Delay analysis.
- Critical path risk summary.
- Suggested task creation.
- Suggested dependency changes.
- Suggested date changes.
- Worklog or blocker summary.

Actual schedule mutations require human apply and must pass normal permission
checks and audit logging.

## Alternatives Considered

### Stage-Level Milestones Only

The platform could track only build stage milestones. This would be simple but
would not support process/material follow-up, task ownership, dependency
analysis, or worklogs.

Rejected because ADR 0005 introduces matrix-level process/material planning that
needs follow-up detail.

### Optional Planning Links

Tasks could optionally link to planning objects. This would make the schedule
system more flexible, but it would drift toward generic project management.

Rejected because every task should remain grounded in NPI planning context.

### Unlimited WBS Hierarchy

An unlimited task hierarchy would support complex programs but would make Gantt
rollups, permissions, and UI behavior much more complex.

Rejected for the first version. Use task plus subtask only.

### Auto Scheduling Engine

The system could calculate dates from dependencies and durations. This would be
powerful but requires a stronger scheduling policy and creates user trust
questions when the system moves dates automatically.

Deferred. Use manual dates plus warning analysis first.

### AI Auto-Apply for Schedule

AI could automatically update schedule tasks under ADR 0004 permissions. This is
deferred because schedule changes affect accountability and cross-functional
commitments. AI should analyze and propose; humans apply.

## Consequences

Positive:

- Schedule tasks remain grounded in NPI planning objects.
- Gantt dependencies can support critical path and delay risk analysis.
- Worklogs provide actual follow-up without becoming a billing timesheet system.
- Field-level audit preserves accountability for schedule changes.
- AI can help analyze schedule risk without silently changing commitments.

Tradeoffs:

- Full task and worklog support adds product and schema complexity.
- Manual dates require users to maintain the plan.
- Warning analysis must be designed clearly so teams do not ignore schedule
  risk.
- Task/readiness separation requires UI that shows both without confusing them.

## Review Scenarios

Use these scenarios to check whether the ADR remains aligned with the intended
platform:

- A task cannot be saved without at least one linked NPI planning object.
- A build stage can have tasks and subtasks, but subtasks cannot nest further.
- A Gantt view can render tasks with FS, SS, FF, and SF dependencies plus lag.
- The system warns about dependency/date conflicts but does not move dates.
- Assignees can update worklogs and task execution status.
- Planner or program owner can change planned dates and dependencies.
- Viewers cannot edit schedule data.
- Worklogs support delay analysis but are not used for billing or payroll.
- AI can propose schedule changes and critical path analysis but cannot
  auto-apply schedule mutations.
- Field-level audit records who changed dates, dependencies, owners, statuses,
  and worklogs.

## Follow-Up ADRs

- ADR 0007: Readiness, Greenlight, At Risk, and Blocked semantics.
- ADR 0008: Background jobs, notifications, and long-running AI workflows.
- ADR 0010: Actual execution import and schedule variance reporting.

