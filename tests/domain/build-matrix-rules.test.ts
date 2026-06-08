import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  buildMatrixEntries,
  buildQtyAllocations,
  buildStages,
  configProfiles,
  projects,
} from "@/db/schema";
import { assertBuildMatrixAllocationIsActive } from "@/lib/domain/build-matrix-rules";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run build matrix tests.");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

after(async () => {
  await pool.end();
});

describe("build matrix rules", () => {
  it("requires an active allocation", () => {
    assert.doesNotThrow(() =>
      assertBuildMatrixAllocationIsActive({
        deletedAt: null,
        status: "active",
      }),
    );
    assert.throws(
      () =>
        assertBuildMatrixAllocationIsActive({
          deletedAt: null,
          status: "on_hold",
        }),
      /requires an active allocation/,
    );
    assert.throws(
      () =>
        assertBuildMatrixAllocationIsActive({
          deletedAt: new Date(),
          status: "active",
        }),
      /requires an active allocation/,
    );
  });

  it("enforces one active matrix entry per allocation and allows recreation after soft delete", async (t) => {
    const fixture = await seedMatrixFixture("single-active-matrix");

    t.after(async () => {
      await db.delete(projects).where(eq(projects.id, fixture.project.id));
    });

    const [entry] = await db
      .insert(buildMatrixEntries)
      .values({
        buildProcessRoute: "SMT-A -> Assembly -> Bring-up",
        buildQtyAllocationId: fixture.allocation.id,
        buildStageId: fixture.stage.id,
        configProfileId: fixture.profile.id,
        keyMaterialVariant: "MLB-A",
        projectId: fixture.project.id,
        readinessStatus: "at_risk",
      })
      .returning();

    await assert.rejects(
      () =>
        db
          .insert(buildMatrixEntries)
          .values({
            buildProcessRoute: "Duplicate route",
            buildQtyAllocationId: fixture.allocation.id,
            buildStageId: fixture.stage.id,
            configProfileId: fixture.profile.id,
            keyMaterialVariant: "MLB-A",
            projectId: fixture.project.id,
            readinessStatus: "blocked",
          })
          .returning(),
      (error) => hasDatabaseCode(error, "23505"),
    );

    await db
      .update(buildMatrixEntries)
      .set({ deletedAt: new Date() })
      .where(eq(buildMatrixEntries.id, entry.id));

    const [recreatedEntry] = await db
      .insert(buildMatrixEntries)
      .values({
        buildProcessRoute: "SMT-B -> Assembly -> Bring-up",
        buildQtyAllocationId: fixture.allocation.id,
        buildStageId: fixture.stage.id,
        configProfileId: fixture.profile.id,
        keyMaterialVariant: "MLB-B",
        projectId: fixture.project.id,
        readinessStatus: "greenlight",
      })
      .returning();

    assert.equal(recreatedEntry.buildQtyAllocationId, fixture.allocation.id);
    assert.equal(recreatedEntry.readinessStatus, "greenlight");
  });

  it("stores Greenlight, At Risk, and Blocked readiness states", async (t) => {
    const fixtures = await Promise.all([
      seedMatrixFixture("greenlight"),
      seedMatrixFixture("at-risk"),
      seedMatrixFixture("blocked"),
    ]);

    t.after(async () => {
      await Promise.all(
        fixtures.map((fixture) =>
          db.delete(projects).where(eq(projects.id, fixture.project.id)),
        ),
      );
    });

    const statuses = ["greenlight", "at_risk", "blocked"] as const;
    const entries = await Promise.all(
      fixtures.map((fixture, index) =>
        db
          .insert(buildMatrixEntries)
          .values({
            buildProcessRoute: `Route ${index}`,
            buildQtyAllocationId: fixture.allocation.id,
            buildStageId: fixture.stage.id,
            configProfileId: fixture.profile.id,
            keyMaterialVariant: `Material ${index}`,
            projectId: fixture.project.id,
            readinessStatus: statuses[index],
          })
          .returning(),
      ),
    );

    assert.deepEqual(
      entries.flat().map((entry) => entry.readinessStatus),
      ["greenlight", "at_risk", "blocked"],
    );
  });
});

async function seedMatrixFixture(suffix: string) {
  const runId = `${suffix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  const [project] = await db
    .insert(projects)
    .values({
      description: `Build matrix test ${runId}`,
      name: `Build matrix test ${runId}`,
      ownerUserId: "test-user",
      status: "draft",
    })
    .returning();

  const [stage] = await db
    .insert(buildStages)
    .values({
      description: "Matrix validation stage",
      goal: "Validate process and material mapping",
      name: "EVT",
      projectId: project.id,
      stageOrder: 1,
      status: "draft",
    })
    .returning();

  const [profile] = await db
    .insert(configProfiles)
    .values({
      buildStageId: stage.id,
      marketOrRegion: "US",
      materialVariant: `MLB-${runId}`,
      processVariant: `SMT-${runId}`,
      productRevision: "A0",
      projectId: project.id,
      testPurpose: "Bring-up",
      variant: "EVT",
    })
    .returning();

  const [allocation] = await db
    .insert(buildQtyAllocations)
    .values({
      allocatedQty: 10,
      buildStageId: stage.id,
      configProfileId: profile.id,
      projectId: project.id,
      rationale: "Matrix mapping test",
      status: "active",
    })
    .returning();

  return { allocation, profile, project, stage };
}

function hasDatabaseCode(error: unknown, code: string) {
  let cursor = error;

  while (cursor && typeof cursor === "object") {
    if ("code" in cursor && cursor.code === code) {
      return true;
    }

    cursor = "cause" in cursor ? cursor.cause : undefined;
  }

  return false;
}
