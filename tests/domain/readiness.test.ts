import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  blockers,
  buildStages,
  projects,
  readinessAuditLogs,
  readinessSignoffs,
  readinessSignals,
} from "@/db/schema";
import {
  buildReadinessWarnings,
  computeWorstChildReadiness,
} from "@/lib/domain/readiness-rules";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run readiness tests.");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

after(async () => {
  await pool.end();
});

describe("readiness rules", () => {
  it("rolls up to the worst child readiness state", () => {
    assert.equal(computeWorstChildReadiness([]), "greenlight");
    assert.equal(
      computeWorstChildReadiness(["greenlight", "at_risk"]),
      "at_risk",
    );
    assert.equal(
      computeWorstChildReadiness(["greenlight", "blocked", "at_risk"]),
      "blocked",
    );
  });

  it("warns when a blocked signal has no active blocker", () => {
    const warnings = buildReadinessWarnings({
      blockers: [],
      readinessSignals: [
        {
          id: "signal-1",
          status: "blocked",
          summary: "Fixture readiness is blocked",
        },
      ],
    });

    assert.equal(warnings.length, 1);
    assert.equal(warnings[0]?.title, "Blocked signal has no active blocker");

    const resolvedWarnings = buildReadinessWarnings({
      blockers: [
        {
          id: "blocker-1",
          readinessSignalId: "signal-1",
          status: "open",
          title: "Fixture blocker",
        },
      ],
      readinessSignals: [
        {
          id: "signal-1",
          status: "blocked",
          summary: "Fixture readiness is blocked",
        },
      ],
    });

    assert.deepEqual(resolvedWarnings, []);
  });

  it("keeps accepted risk blockers visible in blocker and audit records", async (t) => {
    const fixture = await seedReadinessFixture("accepted-risk");

    t.after(async () => {
      await db.delete(projects).where(eq(projects.id, fixture.project.id));
    });

    const [signal] = await db
      .insert(readinessSignals)
      .values({
        buildStageId: fixture.stage.id,
        ownerTeam: "MFG",
        ownerUserId: "test-user",
        projectId: fixture.project.id,
        rationale: "Material shortage accepted for EVT only.",
        status: "at_risk",
        summary: "Material readiness accepted risk",
        targetId: fixture.stage.id,
        targetType: "build_stage",
      })
      .returning();
    const [blocker] = await db
      .insert(blockers)
      .values({
        buildStageId: fixture.stage.id,
        impact: "EVT can proceed with alternate material disposition.",
        mitigation: "Use approved substitute material for 10 units.",
        ownerTeam: "MFG",
        ownerUserId: "test-user",
        projectId: fixture.project.id,
        readinessSignalId: signal.id,
        severity: "medium",
        status: "accepted_risk",
        targetId: fixture.stage.id,
        targetType: "build_stage",
        title: "Alternate material accepted risk",
      })
      .returning();
    const [auditLog] = await db
      .insert(readinessAuditLogs)
      .values({
        actorUserId: "test-user",
        afterValue: {
          status: "accepted_risk",
          title: blocker.title,
        },
        blockerId: blocker.id,
        buildStageId: fixture.stage.id,
        eventType: "blocker_created",
        fieldName: "status",
        projectId: fixture.project.id,
        readinessSignalId: signal.id,
        reason: blocker.mitigation,
      })
      .returning();

    const activeBlockers = await db
      .select()
      .from(blockers)
      .where(eq(blockers.projectId, fixture.project.id));
    const auditRows = await db
      .select()
      .from(readinessAuditLogs)
      .where(eq(readinessAuditLogs.projectId, fixture.project.id));

    assert.equal(blocker.status, "accepted_risk");
    assert.equal(activeBlockers.length, 1);
    assert.equal(activeBlockers[0]?.id, blocker.id);
    assert.equal(auditLog.eventType, "blocker_created");
    assert.deepEqual(auditRows[0]?.afterValue, {
      status: "accepted_risk",
      title: "Alternate material accepted risk",
    });
  });

  it("stores readiness signoff disposition and audit without mutating signal status", async (t) => {
    const fixture = await seedReadinessFixture("signoff");

    t.after(async () => {
      await db.delete(projects).where(eq(projects.id, fixture.project.id));
    });

    const [signal] = await db
      .insert(readinessSignals)
      .values({
        buildStageId: fixture.stage.id,
        ownerTeam: "Quality",
        ownerUserId: "test-user",
        projectId: fixture.project.id,
        rationale: "Quality accepts the EVT residual issue.",
        status: "at_risk",
        summary: "Quality readiness requires signoff",
        targetId: fixture.stage.id,
        targetType: "build_stage",
      })
      .returning();
    const [signoff] = await db
      .insert(readinessSignoffs)
      .values({
        disposition: "accepted_risk",
        notes: "Proceed for EVT only with daily containment review.",
        projectId: fixture.project.id,
        readinessSignalId: signal.id,
        signerUserId: "quality-reviewer",
      })
      .returning();
    await db.insert(readinessAuditLogs).values({
      actorUserId: "quality-reviewer",
      afterValue: {
        disposition: signoff.disposition,
        readinessSignalId: signal.id,
        signalStatus: signal.status,
      },
      buildStageId: fixture.stage.id,
      eventType: "readiness_signoff_created",
      fieldName: "disposition",
      projectId: fixture.project.id,
      readinessSignalId: signal.id,
      readinessSignoffId: signoff.id,
      reason: signoff.notes,
    });

    const [storedSignal] = await db
      .select()
      .from(readinessSignals)
      .where(eq(readinessSignals.id, signal.id));
    const signoffRows = await db
      .select()
      .from(readinessSignoffs)
      .where(eq(readinessSignoffs.projectId, fixture.project.id));
    const auditRows = await db
      .select()
      .from(readinessAuditLogs)
      .where(eq(readinessAuditLogs.projectId, fixture.project.id));

    assert.equal(storedSignal?.status, "at_risk");
    assert.equal(signoffRows.length, 1);
    assert.equal(signoffRows[0]?.disposition, "accepted_risk");
    assert.equal(auditRows[0]?.eventType, "readiness_signoff_created");
    assert.deepEqual(auditRows[0]?.afterValue, {
      disposition: "accepted_risk",
      readinessSignalId: signal.id,
      signalStatus: "at_risk",
    });
  });
});

async function seedReadinessFixture(suffix: string) {
  const runId = `${suffix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  const [project] = await db
    .insert(projects)
    .values({
      description: `Readiness test ${runId}`,
      name: `Readiness test ${runId}`,
      ownerUserId: "test-user",
      status: "draft",
    })
    .returning();
  const [stage] = await db
    .insert(buildStages)
    .values({
      description: "Readiness validation stage",
      goal: "Validate readiness and blocker semantics",
      name: "EVT",
      projectId: project.id,
      stageOrder: 1,
      status: "draft",
    })
    .returning();

  return { project, stage };
}
