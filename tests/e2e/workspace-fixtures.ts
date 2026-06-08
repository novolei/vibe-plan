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
  const runId = `mvp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  const [mapping] = await e2eDb
    .insert(demandProfileMappings)
    .values({
      configProfileId: profile.id,
      contributionQty: 12,
      functionalTeamDemandId: demand.id,
      rationale: "EE bring-up units map to A0 EVT profile",
    })
    .returning();

  const [allocation] = await e2eDb
    .insert(buildQtyAllocations)
    .values({
      allocatedQty: 10,
      buildStageId: stage.id,
      configProfileId: profile.id,
      projectId: project.id,
      rationale: "Intentional mismatch for walkthrough warning",
      status: "active",
    })
    .returning();

  return { allocation, demand, mapping, profile, project, stage };
}

export async function deleteProjectFixture(projectId: string) {
  await e2eDb.delete(projects).where(eq(projects.id, projectId));
}
