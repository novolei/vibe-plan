# ADR-Backed MVP Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the ADR-backed Vibe Plan MVP from current project/stage/demand/allocation workflow through tested build matrix, AI proposal, readiness, and schedule extension foundations.

**Architecture:** Keep the Next.js App Router monolith and server-only domain boundary from ADR 0002. Add each ADR-backed capability as a vertical slice: Drizzle schema and migration, domain rules, server actions, planning UI, and tests.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Clerk, Drizzle ORM, Postgres, Zod, Tailwind CSS, shadcn/ui, Node test runner through `tsx --test`, OpenAI-compatible AI adapter with DeepSeek-compatible configuration.

---

## Preconditions

- Work from a feature branch, not directly on `main`.
- Run `git status --short --branch` before starting each task.
- Keep `.env.local` secrets uncommitted.
- Local Postgres should be available with `pnpm db:local:up`.
- Run `pnpm db:migrate` after schema migrations are created.

## Task 1: Land Domain Rule Tests

**Files:**

- Modify: `package.json`
- Modify: `lib/domain/projects.ts`
- Create: `lib/domain/planning-rules.ts`
- Create: `lib/domain/allocation-change-logs.ts`
- Create: `tests/domain/planning-rules.test.ts`
- Create: `tests/domain/allocation-change-logs.test.ts`
- Create: `tests/db/planning-schema.test.ts`

- [ ] **Step 1: Check whether Ticket 5.1 is already present**

Run:

```bash
git log --oneline --decorate --all | rg "Add domain rule tests|5532822"
test -f tests/domain/planning-rules.test.ts && echo "tests present"
```

Expected if the ticket is already merged or checked out:

```text
tests present
```

Expected if not present:

```text
no output from the test command
```

- [ ] **Step 2: Bring in the existing Ticket 5.1 commit when absent**

Run only if Step 1 did not print `tests present`:

```bash
git fetch origin codex/ticket-5-1-domain-tests
git cherry-pick 5532822
```

Expected:

```text
[current-branch ...] Add domain rule tests
```

- [ ] **Step 3: Verify domain rules**

Run:

```bash
pnpm test
```

Expected:

```text
tests 7
pass 7
fail 0
```

- [ ] **Step 4: Commit if the cherry-pick created local changes**

Run:

```bash
git status --short
```

If the working tree is dirty because Step 2 was manually recreated instead of
cherry-picked, run:

```bash
git add package.json lib/domain/projects.ts lib/domain/planning-rules.ts lib/domain/allocation-change-logs.ts tests
git commit -m "Add domain rule tests"
```

Expected:

```text
[current-branch ...] Add domain rule tests
```

## Task 2: Add MVP Browser Walkthrough Test

**Files:**

- Modify: `package.json`
- Create: `tests/e2e/mvp-workflow.test.ts`
- Create: `tests/e2e/test-db.ts`
- Create: `tests/e2e/workspace-fixtures.ts`
- Modify: `docs/implementation/mvp-v0.1-tickets.md`

- [ ] **Step 1: Add scripts for browser walkthrough execution**

Add these scripts to `package.json`:

```json
{
  "test": "tsx --test tests/**/*.test.ts",
  "test:e2e": "tsx --test tests/e2e/**/*.test.ts"
}
```

Expected: `pnpm test:e2e` runs the Node test runner and discovers e2e test
files once they exist.

- [ ] **Step 2: Create `tests/e2e/test-db.ts`**

```ts
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for e2e tests.");
}

export const e2ePool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const e2eDb = drizzle(e2ePool, { schema });
```

- [ ] **Step 3: Create `tests/e2e/workspace-fixtures.ts`**

```ts
import { eq } from "drizzle-orm";

import {
  buildQtyAllocations,
  buildStages,
  configProfiles,
  demandProfileMappings,
  functionalTeamDemands,
  projects,
} from "@/db/schema";
import { e2eDb } from "@/tests/e2e/test-db";

export async function seedMvpWorkflowFixture() {
  const runId = `mvp-${Date.now()}`;
  const [project] = await e2eDb
    .insert(projects)
    .values({
      description: `MVP walkthrough ${runId}`,
      name: `MVP Walkthrough ${runId}`,
      ownerUserId: "e2e-user",
      status: "draft",
    })
    .returning();

  const [stage] = await e2eDb
    .insert(buildStages)
    .values({
      description: "Engineering validation build",
      goal: "Validate the first stage-centric planning flow",
      name: "EVT",
      projectId: project.id,
      stageOrder: 1,
      status: "draft",
    })
    .returning();

  const [demand] = await e2eDb
    .insert(functionalTeamDemands)
    .values({
      buildStageId: stage.id,
      ownerUserId: "e2e-user",
      priority: "must-have",
      projectId: project.id,
      purpose: "Bring-up validation",
      requestedQty: 12,
      team: "EE",
    })
    .returning();

  const [profile] = await e2eDb
    .insert(configProfiles)
    .values({
      buildStageId: stage.id,
      marketOrRegion: "US",
      materialVariant: "MLB-A",
      processVariant: "SMT-A",
      productRevision: "A0",
      projectId: project.id,
      testPurpose: "Bring-up",
      variant: "EVT",
    })
    .returning();

  await e2eDb.insert(demandProfileMappings).values({
    configProfileId: profile.id,
    contributionQty: 12,
    functionalTeamDemandId: demand.id,
    rationale: "EE bring-up units map to A0 EVT profile",
  });

  await e2eDb.insert(buildQtyAllocations).values({
    allocatedQty: 10,
    buildStageId: stage.id,
    configProfileId: profile.id,
    projectId: project.id,
    rationale: "Intentional mismatch for walkthrough warning",
    status: "active",
  });

  return { demand, profile, project, stage };
}

export async function deleteProjectFixture(projectId: string) {
  await e2eDb.delete(projects).where(eq(projects.id, projectId));
}
```

- [ ] **Step 4: Create `tests/e2e/mvp-workflow.test.ts`**

```ts
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { e2ePool } from "@/tests/e2e/test-db";
import {
  deleteProjectFixture,
  seedMvpWorkflowFixture,
} from "@/tests/e2e/workspace-fixtures";

describe("MVP workflow fixture", () => {
  after(async () => {
    await e2ePool.end();
  });

  it("creates the project to allocation records used by the browser walkthrough", async (t) => {
    const fixture = await seedMvpWorkflowFixture();

    t.after(async () => {
      await deleteProjectFixture(fixture.project.id);
    });

    assert.equal(fixture.project.name.startsWith("MVP Walkthrough"), true);
    assert.equal(fixture.stage.name, "EVT");
    assert.equal(fixture.demand.requestedQty, 12);
    assert.equal(fixture.profile.productRevision, "A0");
  });
});
```

- [ ] **Step 5: Run the walkthrough fixture test**

Run:

```bash
pnpm test:e2e
```

Expected:

```text
pass 1
fail 0
```

- [ ] **Step 6: Update Ticket 5.2 status notes**

Append this note to `docs/implementation/mvp-v0.1-tickets.md` under Ticket 5.2:

```markdown
Implementation note: MVP walkthrough verification starts with a DB-backed
fixture test that creates Project -> Stage -> Demand -> Profile -> Mapping ->
Allocation records. A later browser automation layer can reuse the same fixture
to assert rendered warnings and audit state.
```

- [ ] **Step 7: Commit Task 2**

Run:

```bash
git add package.json tests/e2e docs/implementation/mvp-v0.1-tickets.md
git commit -m "Add MVP workflow walkthrough fixture"
```

Expected:

```text
[current-branch ...] Add MVP workflow walkthrough fixture
```

## Task 3: Add Build Matrix MVP

**Files:**

- Modify: `db/schema/index.ts`
- Create: `db/migrations/<generated>_build_matrix_entries.sql`
- Modify: `lib/validation/planning.ts`
- Modify: `lib/domain/projects.ts`
- Modify: `app/workspace/actions.ts`
- Modify: `components/planning/action-forms.tsx`
- Modify: `app/workspace/projects/[projectId]/page.tsx`
- Create: `tests/domain/build-matrix-rules.test.ts`
- Modify: `docs/implementation/mvp-v0.1-tickets.md`

- [ ] **Step 1: Add build matrix schema**

Add a `matrixReadinessStatus` enum and `buildMatrixEntries` table:

```ts
export const matrixReadinessStatus = pgEnum("matrix_readiness_status", [
  "greenlight",
  "at_risk",
  "blocked",
]);

export const buildMatrixEntries = pgTable(
  "build_matrix_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id")
      .notNull()
      .references(() => buildStages.id, { onDelete: "cascade" }),
    configProfileId: uuid("config_profile_id")
      .notNull()
      .references(() => configProfiles.id, { onDelete: "cascade" }),
    buildQtyAllocationId: uuid("build_qty_allocation_id")
      .notNull()
      .references(() => buildQtyAllocations.id, { onDelete: "cascade" }),
    buildProcessRoute: text("build_process_route").notNull(),
    keyMaterialVariant: text("key_material_variant").notNull(),
    processOwnerTeam: text("process_owner_team").notNull().default(""),
    materialOwnerTeam: text("material_owner_team").notNull().default(""),
    readinessStatus: matrixReadinessStatus("readiness_status")
      .notNull()
      .default("at_risk"),
    notes: text("notes").notNull().default(""),
    aiSource: jsonb("ai_source").$type<Record<string, unknown>>(),
    proposalRef: text("proposal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("build_matrix_entries_project_id_idx").on(table.projectId),
    index("build_matrix_entries_build_stage_id_idx").on(table.buildStageId),
    index("build_matrix_entries_config_profile_id_idx").on(
      table.configProfileId,
    ),
    index("build_matrix_entries_allocation_id_idx").on(
      table.buildQtyAllocationId,
    ),
    uniqueIndex("build_matrix_entries_active_allocation_uidx")
      .on(table.buildQtyAllocationId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
```

- [ ] **Step 2: Generate and apply migration**

Run:

```bash
pnpm db:generate
pnpm db:migrate
```

Expected:

```text
No errors from drizzle-kit generate or migration execution.
```

- [ ] **Step 3: Add validation schema**

Add to `lib/validation/planning.ts`:

```ts
export const buildMatrixEntryCreateSchema = z.object({
  projectId: z.string().uuid(),
  buildQtyAllocationId: z.string().uuid(),
  buildProcessRoute: z
    .string()
    .trim()
    .min(1, "Build process route is required"),
  keyMaterialVariant: z
    .string()
    .trim()
    .min(1, "Key material variant is required"),
  processOwnerTeam: z.string().trim().optional(),
  materialOwnerTeam: z.string().trim().optional(),
  readinessStatus: z.enum(["greenlight", "at_risk", "blocked"]),
  notes: z.string().trim().optional(),
});
```

- [ ] **Step 4: Add domain service**

Add a `createBuildMatrixEntry` service that loads the allocation, verifies the
project scope, copies `buildStageId` and `configProfileId` from the allocation,
and inserts the matrix entry.

Run:

```bash
pnpm exec tsc --noEmit
```

Expected:

```text
No TypeScript errors.
```

- [ ] **Step 5: Add server action and form**

Add `createBuildMatrixEntryAction` in `app/workspace/actions.ts` and a
`BuildMatrixEntryForm` in `components/planning/action-forms.tsx` using the same
`useActionState` UX pattern as demand/profile/allocation forms.

Expected UI copy:

```text
Matrix entry saved.
```

- [ ] **Step 6: Render matrix section**

Update `app/workspace/projects/[projectId]/page.tsx` so the project workspace
shows:

- Matrix table with process route, material variant, owner teams, readiness,
  and notes.
- Empty state when no allocation exists.
- Matrix form once allocations exist.

- [ ] **Step 7: Add build matrix tests**

Create `tests/domain/build-matrix-rules.test.ts` covering:

- Matrix entry must link to an active allocation.
- A soft-deleted matrix entry allows the allocation to be mapped again.
- Readiness status accepts `greenlight`, `at_risk`, and `blocked`.

Run:

```bash
pnpm test
```

Expected:

```text
fail 0
```

- [ ] **Step 8: Commit Task 3**

Run:

```bash
git add db/schema/index.ts db/migrations db/migrations/meta lib/validation/planning.ts lib/domain/projects.ts app/workspace/actions.ts components/planning/action-forms.tsx app/workspace/projects/[projectId]/page.tsx tests/domain/build-matrix-rules.test.ts docs/implementation/mvp-v0.1-tickets.md
git commit -m "Add build matrix MVP"
```

Expected:

```text
[current-branch ...] Add build matrix MVP
```

## Task 4: Add AI Proposal and Audit MVP

**Files:**

- Modify: `db/schema/index.ts`
- Create: `db/migrations/<generated>_ai_proposal_audit.sql`
- Create: `lib/domain/ai-proposals.ts`
- Create: `lib/domain/planning-copilot.ts`
- Modify: `app/workspace/actions.ts`
- Modify: `app/workspace/projects/[projectId]/page.tsx`
- Create: `tests/domain/ai-proposals.test.ts`

- [ ] **Step 1: Add AI schema**

Add tables for `ai_agents`, `ai_runs`, `ai_proposals`, `ai_operations`, and
`ai_audit_events` with project, stage, status, source context, rationale,
confidence, operation payload, human disposition, and audit fields from ADR 0004.

- [ ] **Step 2: Generate and apply migration**

Run:

```bash
pnpm db:generate
pnpm db:migrate
```

Expected:

```text
No migration errors.
```

- [ ] **Step 3: Add proposal service**

Create `lib/domain/ai-proposals.ts` with functions:

```ts
export async function createAiProposal(input: CreateAiProposalInput) {}
export async function reviewAiProposal(input: ReviewAiProposalInput) {}
export async function listAiProposalsForProject(projectId: string) {}
```

Each function must require auth context and project scope.

- [ ] **Step 4: Add planning copilot service**

Create `lib/domain/planning-copilot.ts` with:

```ts
export async function generateStageSummaryProposal(input: {
  projectId: string;
  buildStageId: string;
}) {}
```

The function should gather project planning records, call `createAIProvider()`,
and persist a proposal with status `pending`. It must not apply domain changes.

- [ ] **Step 5: Add proposal review UI**

Render pending proposals in the project workspace with Accept, Reject, and
Revise disposition actions. Accepted means reviewed, not automatically
baseline-approved.

- [ ] **Step 6: Add AI proposal tests**

Tests must verify:

- Proposal stores source context and rationale.
- Review disposition writes reviewer and timestamp.
- Proposal operation payload is not applied without an explicit apply path.

Run:

```bash
pnpm test
```

Expected:

```text
fail 0
```

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add db/schema/index.ts db/migrations db/migrations/meta lib/domain/ai-proposals.ts lib/domain/planning-copilot.ts app/workspace/actions.ts app/workspace/projects/[projectId]/page.tsx tests/domain/ai-proposals.test.ts
git commit -m "Add AI proposal audit MVP"
```

Expected:

```text
[current-branch ...] Add AI proposal audit MVP
```

## Task 5: Add Readiness and Blocker MVP

**Files:**

- Modify: `db/schema/index.ts`
- Create: `db/migrations/<generated>_readiness_blockers.sql`
- Create: `lib/domain/readiness.ts`
- Modify: `app/workspace/actions.ts`
- Modify: `app/workspace/projects/[projectId]/page.tsx`
- Create: `tests/domain/readiness.test.ts`

- [ ] **Step 1: Add readiness schema**

Add enums and tables:

- `readiness_status`: `greenlight`, `at_risk`, `blocked`
- `blocker_status`: `open`, `mitigating`, `resolved`, `accepted_risk`
- `readiness_signals`
- `readiness_rollups`
- `blockers`
- `readiness_signoffs`
- `readiness_audit_logs`

- [ ] **Step 2: Generate and apply migration**

Run:

```bash
pnpm db:generate
pnpm db:migrate
```

Expected:

```text
No migration errors.
```

- [ ] **Step 3: Add readiness domain rules**

Create `lib/domain/readiness.ts` with:

```ts
export function computeWorstChildReadiness(
  statuses: Array<"greenlight" | "at_risk" | "blocked">,
) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("at_risk")) return "at_risk";
  return "greenlight";
}
```

Also add services to create readiness signals and blockers scoped to project and
stage.

- [ ] **Step 4: Add readiness UI**

Render a readiness panel on the project page showing:

- Stage readiness summary.
- Matrix entry readiness rows when matrix entries exist.
- Open blockers with owner, severity, due date, impact, and mitigation.

- [ ] **Step 5: Add readiness tests**

Tests must verify:

- Worst child rollup.
- Blocked signal without blocker creates a warning.
- Accepted risk remains visible and does not disappear from audit data.

Run:

```bash
pnpm test
```

Expected:

```text
fail 0
```

- [ ] **Step 6: Commit Task 5**

Run:

```bash
git add db/schema/index.ts db/migrations db/migrations/meta lib/domain/readiness.ts app/workspace/actions.ts app/workspace/projects/[projectId]/page.tsx tests/domain/readiness.test.ts
git commit -m "Add readiness and blocker MVP"
```

Expected:

```text
[current-branch ...] Add readiness and blocker MVP
```

## Task 6: Add Schedule Extension MVP

**Files:**

- Modify: `db/schema/index.ts`
- Create: `db/migrations/<generated>_schedule_extension.sql`
- Create: `lib/domain/schedule.ts`
- Modify: `app/workspace/actions.ts`
- Modify: `app/workspace/projects/[projectId]/page.tsx`
- Create: `tests/domain/schedule.test.ts`

- [ ] **Step 1: Add schedule schema**

Add tables:

- `schedule_tasks`
- `schedule_task_links`
- `schedule_dependencies`
- `schedule_worklogs`
- `schedule_audit_logs`

- [ ] **Step 2: Generate and apply migration**

Run:

```bash
pnpm db:generate
pnpm db:migrate
```

Expected:

```text
No migration errors.
```

- [ ] **Step 3: Add schedule domain rules**

Create `lib/domain/schedule.ts` with:

```ts
export function hasFinishToStartConflict(input: {
  predecessorEndDate: Date;
  successorStartDate: Date;
  lagDays: number;
}) {
  const earliestStart = new Date(input.predecessorEndDate);
  earliestStart.setDate(earliestStart.getDate() + input.lagDays);
  return input.successorStartDate < earliestStart;
}
```

Also add services to create a task and require at least one active
`schedule_task_links` row.

- [ ] **Step 4: Add schedule UI**

Render a schedule panel with:

- Stage task list.
- Linked object type and id.
- Planned start/end.
- Status and owner.
- Dependency conflict warnings.

- [ ] **Step 5: Add schedule tests**

Tests must verify:

- Task requires one active planning-object link.
- Finish-to-start conflict is detected.
- Blocked task does not automatically mutate readiness status.

Run:

```bash
pnpm test
```

Expected:

```text
fail 0
```

- [ ] **Step 6: Commit Task 6**

Run:

```bash
git add db/schema/index.ts db/migrations db/migrations/meta lib/domain/schedule.ts app/workspace/actions.ts app/workspace/projects/[projectId]/page.tsx tests/domain/schedule.test.ts
git commit -m "Add schedule extension MVP"
```

Expected:

```text
[current-branch ...] Add schedule extension MVP
```

## Task 7: Final Verification and Documentation

**Files:**

- Modify: `docs/implementation/mvp-v0.1-tickets.md`
- Modify: `docs/specs/stage-centric-npi-build-planning-platform.md`
- Modify: `docs/design/stage-centric-npi-build-planning-system-design.md`

- [ ] **Step 1: Run all gates**

Run:

```bash
pnpm test
pnpm test:e2e
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Expected:

```text
fail 0 for tests, no TypeScript errors, no lint errors, production build succeeds.
```

- [ ] **Step 2: Update implementation status**

Update the spec and design current-status sections so each ADR-backed slice is
marked as implemented, partial, or deferred with exact file references.

- [ ] **Step 3: Commit final documentation**

Run:

```bash
git add docs/implementation/mvp-v0.1-tickets.md docs/specs/stage-centric-npi-build-planning-platform.md docs/design/stage-centric-npi-build-planning-system-design.md
git commit -m "Document ADR-backed MVP completion status"
```

Expected:

```text
[current-branch ...] Document ADR-backed MVP completion status
```

- [ ] **Step 4: Push branch**

Run:

```bash
git push -u origin "$(git branch --show-current)"
```

Expected:

```text
branch '<branch-name>' set up to track 'origin/<branch-name>'
```

## Self-Review

- Spec coverage: ADR 0001 is covered by core workflow, MVP scope, and
  acceptance scenarios. ADR 0002 is covered by repository and runtime
  boundaries. ADR 0003 is covered by Task 1 through Task 3. ADR 0004 is covered
  by Task 4. ADR 0005 is covered by Task 3. ADR 0006 is covered by Task 6. ADR
  0007 is covered by Task 5.
- Placeholder scan: this plan does not use deferred-work marker phrases or
  undefined placeholder steps.
- Type consistency: table and field names use the existing camelCase Drizzle
  convention and snake_case database column convention already present in
  `db/schema/index.ts`.
