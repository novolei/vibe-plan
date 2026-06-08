import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  buildStages,
  projects,
  readinessSignals,
  scheduleTaskLinks,
  scheduleTasks,
} from "@/db/schema";
import {
  assertScheduleTaskHasActiveLink,
  hasFinishToStartConflict,
} from "@/lib/domain/schedule-rules";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run schedule tests.");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

after(async () => {
  await pool.end();
});

describe("schedule rules", () => {
  it("requires at least one active planning-object link", () => {
    assert.doesNotThrow(() =>
      assertScheduleTaskHasActiveLink([{ deletedAt: null }]),
    );
    assert.throws(
      () =>
        assertScheduleTaskHasActiveLink([
          { deletedAt: new Date("2026-06-08T00:00:00Z") },
        ]),
      /requires at least one active planning link/,
    );
    assert.throws(
      () => assertScheduleTaskHasActiveLink([]),
      /requires at least one active planning link/,
    );
  });

  it("detects finish-to-start dependency conflicts", () => {
    assert.equal(
      hasFinishToStartConflict({
        lagDays: 1,
        predecessorEndDate: new Date("2026-06-10T00:00:00Z"),
        successorStartDate: new Date("2026-06-10T00:00:00Z"),
      }),
      true,
    );
    assert.equal(
      hasFinishToStartConflict({
        lagDays: 1,
        predecessorEndDate: new Date("2026-06-10T00:00:00Z"),
        successorStartDate: new Date("2026-06-11T00:00:00Z"),
      }),
      false,
    );
  });

  it("does not mutate readiness when a linked schedule task is blocked", async (t) => {
    const fixture = await seedScheduleFixture("blocked-task-separation");

    t.after(async () => {
      await db.delete(projects).where(eq(projects.id, fixture.project.id));
    });

    const [signal] = await db
      .insert(readinessSignals)
      .values({
        buildStageId: fixture.stage.id,
        ownerTeam: "PM",
        ownerUserId: "test-user",
        projectId: fixture.project.id,
        rationale: "Stage is ready; schedule task may still be blocked.",
        status: "greenlight",
        summary: "Stage greenlight",
        targetId: fixture.stage.id,
        targetType: "build_stage",
      })
      .returning();
    const [task] = await db
      .insert(scheduleTasks)
      .values({
        buildStageId: fixture.stage.id,
        ownerUserId: "test-user",
        plannedEndDate: new Date("2026-06-12T00:00:00Z"),
        plannedStartDate: new Date("2026-06-10T00:00:00Z"),
        priority: "high",
        projectId: fixture.project.id,
        status: "blocked",
        title: "Blocked but readiness-independent task",
      })
      .returning();

    await db.insert(scheduleTaskLinks).values({
      linkedObjectId: signal.id,
      linkedObjectType: "readiness_signal",
      projectId: fixture.project.id,
      scheduleTaskId: task.id,
    });

    const [storedSignal] = await db
      .select()
      .from(readinessSignals)
      .where(eq(readinessSignals.id, signal.id));
    const [storedTask] = await db
      .select()
      .from(scheduleTasks)
      .where(eq(scheduleTasks.id, task.id));

    assert.equal(storedTask.status, "blocked");
    assert.equal(storedSignal.status, "greenlight");
  });
});

async function seedScheduleFixture(suffix: string) {
  const runId = `${suffix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  const [project] = await db
    .insert(projects)
    .values({
      description: `Schedule test ${runId}`,
      name: `Schedule test ${runId}`,
      ownerUserId: "test-user",
      status: "draft",
    })
    .returning();
  const [stage] = await db
    .insert(buildStages)
    .values({
      description: "Schedule validation stage",
      goal: "Validate schedule extension model",
      name: "EVT",
      projectId: project.id,
      stageOrder: 1,
      status: "draft",
    })
    .returning();

  return { project, stage };
}
