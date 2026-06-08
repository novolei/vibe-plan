import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { loadEnvConfig } from "@next/env";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  buildQtyAllocations,
  buildStages,
  configProfiles,
  functionalTeamDemands,
  projects,
} from "@/db/schema";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run DB rule tests.");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

after(async () => {
  await pool.end();
});

describe("planning schema rules", () => {
  it("enforces active config profile structural-key uniqueness and allows recreation after soft delete", async (t) => {
    const { project, stage } = await seedProjectAndStage("structural-key");

    t.after(async () => {
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    const profileValues = {
      buildStageId: stage.id,
      marketOrRegion: "US",
      materialVariant: "MLB-A",
      processVariant: "SMT-A",
      productRevision: "A0",
      projectId: project.id,
      testPurpose: "Bring-up",
      variant: "EVT",
    };

    const [profile] = await db
      .insert(configProfiles)
      .values(profileValues)
      .returning();

    await assert.rejects(
      () => db.insert(configProfiles).values(profileValues).returning(),
      (error) => hasDatabaseCode(error, "23505"),
    );

    await db
      .update(configProfiles)
      .set({ deletedAt: new Date() })
      .where(eq(configProfiles.id, profile.id));

    const [recreatedProfile] = await db
      .insert(configProfiles)
      .values(profileValues)
      .returning();

    const activeProfiles = await db
      .select()
      .from(configProfiles)
      .where(
        and(
          eq(configProfiles.buildStageId, stage.id),
          isNull(configProfiles.deletedAt),
        ),
      );

    assert.equal(activeProfiles.length, 1);
    assert.equal(activeProfiles[0]?.id, recreatedProfile.id);
  });

  it("excludes soft-deleted demands, profiles, and allocations from active planning queries", async (t) => {
    const { project, stage } = await seedProjectAndStage("soft-delete");

    t.after(async () => {
      await db.delete(projects).where(eq(projects.id, project.id));
    });

    const [activeDemand, deletedDemand] = await db
      .insert(functionalTeamDemands)
      .values([
        {
          buildStageId: stage.id,
          ownerUserId: "test-user",
          priority: "must-have",
          projectId: project.id,
          purpose: "Validation",
          requestedQty: 10,
          team: "Quality",
        },
        {
          buildStageId: stage.id,
          deletedAt: new Date(),
          ownerUserId: "test-user",
          priority: "nice-to-have",
          projectId: project.id,
          purpose: "Obsolete request",
          requestedQty: 5,
          team: "Quality",
        },
      ])
      .returning();

    const [activeProfile, deletedProfile] = await db
      .insert(configProfiles)
      .values([
        {
          buildStageId: stage.id,
          marketOrRegion: "US",
          materialVariant: "MLB-A",
          processVariant: "SMT-A",
          productRevision: "A0",
          projectId: project.id,
          testPurpose: "Validation",
          variant: "EVT",
        },
        {
          buildStageId: stage.id,
          deletedAt: new Date(),
          marketOrRegion: "EU",
          materialVariant: "MLB-B",
          processVariant: "SMT-B",
          productRevision: "A1",
          projectId: project.id,
          testPurpose: "Obsolete",
          variant: "EVT",
        },
      ])
      .returning();

    const [activeAllocation, deletedAllocation] = await db
      .insert(buildQtyAllocations)
      .values([
        {
          allocatedQty: 10,
          buildStageId: stage.id,
          configProfileId: activeProfile.id,
          projectId: project.id,
          rationale: "Active allocation",
          status: "active",
        },
        {
          allocatedQty: 4,
          buildStageId: stage.id,
          configProfileId: activeProfile.id,
          deletedAt: new Date(),
          projectId: project.id,
          rationale: "Deleted allocation",
          status: "active",
        },
      ])
      .returning();

    const activeDemands = await db
      .select()
      .from(functionalTeamDemands)
      .where(
        and(
          eq(functionalTeamDemands.projectId, project.id),
          isNull(functionalTeamDemands.deletedAt),
        ),
      );
    const activeProfiles = await db
      .select()
      .from(configProfiles)
      .where(
        and(
          eq(configProfiles.projectId, project.id),
          isNull(configProfiles.deletedAt),
        ),
      );
    const activeAllocations = await db
      .select()
      .from(buildQtyAllocations)
      .where(
        and(
          eq(buildQtyAllocations.projectId, project.id),
          isNull(buildQtyAllocations.deletedAt),
        ),
      );

    assert.deepEqual(
      activeDemands.map((demand) => demand.id),
      [activeDemand.id],
    );
    assert.notEqual(activeDemands[0]?.id, deletedDemand.id);
    assert.deepEqual(
      activeProfiles.map((profile) => profile.id),
      [activeProfile.id],
    );
    assert.notEqual(activeProfiles[0]?.id, deletedProfile.id);
    assert.deepEqual(
      activeAllocations.map((allocation) => allocation.id),
      [activeAllocation.id],
    );
    assert.notEqual(activeAllocations[0]?.id, deletedAllocation.id);
  });
});

async function seedProjectAndStage(suffix: string) {
  const runId = `${suffix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  const [project] = await db
    .insert(projects)
    .values({
      description: `Domain rule test ${runId}`,
      name: `Domain rule test ${runId}`,
      ownerUserId: "test-user",
      status: "draft",
    })
    .returning();

  const [stage] = await db
    .insert(buildStages)
    .values({
      description: "Engineering validation build",
      goal: "Validate first build planning rules",
      name: "EVT",
      projectId: project.id,
      stageOrder: 1,
      status: "draft",
    })
    .returning();

  return { project, stage };
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
