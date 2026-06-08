# Workflow UI/UX Redesign

- Date: 2026-06-09
- Scope: Web platform workspace UI and project planning layout
- Source: ADR 0001 through ADR 0007, MVP v0.1 implementation

## Design Intent

The planning workspace should follow the NPI build planning process instead of
showing every form at once. The primary user should always understand where
they are in the Project -> Demand -> Profile -> Allocation -> Matrix -> BOM ->
Schedule -> Readiness -> Final Dashboard flow.

## Layout Model

- Top project command bar: project name, status, active stage, requested qty,
  allocated qty, readiness, and review signal count.
- Stage selector: keeps every workflow view scoped to the selected build stage.
- Left ADR workflow rail: one step per core process object, with completion or
  risk status.
- Main step panel: renders only the active workflow step so forms do not stack.
- Review rail: AI Planning Copilot and non-blocking review signals stay visible
  as contextual support.
- Final dashboard: consolidates the final build matrix, schedule preview,
  readiness, planning warnings, and allocation audit.

## Workflow Steps

1. Project: build stage creation and stage list.
2. Demand: x-function team demand intake.
3. Profiles: structured config/profile definition.
4. Allocation: demand/profile mapping and build qty allocation.
5. Matrix: process route and material variant mapping.
6. BOM CSV: client-side CSV preview and required-column validation.
7. Schedule: schedule tasks and dependency warnings.
8. Readiness: Greenlight, At Risk, Blocked signals and blockers.
9. Final: dashboard view for final matrix and schedule readiness.

## UX Rules

- Do not show all creation forms on one long page.
- Keep dense operational tables, but place them inside the relevant step.
- Make empty states actionable and stage-aware.
- Use warnings as non-blocking signals, not modal interruptions.
- AI proposals remain reviewable side content; they do not take over the
  workflow.
- BOM CSV import is a frontend contract for now; persistence and BOM semantics
  should land in a future ADR-backed backend ticket.

## Verification Notes

Checked desktop and mobile workspace layouts in the browser against the concept
direction:

- Desktop final dashboard shows project metrics, workflow rail, matrix,
  schedule, warnings, and audit sections.
- BOM CSV step shows upload/drop affordance, column mapping, validation status,
  and preview table area.
- Allocation step shows mapping and allocation as a focused workflow step.
- Mobile layout collapses summary tiles and workflow rail without horizontal
  body scroll.
- Clerk development toast can appear during local verification; it is external
  to the app UI.
