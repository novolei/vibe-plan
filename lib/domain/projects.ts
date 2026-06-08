import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import {
  allocationChangeLogs,
  buildMatrixEntries,
  buildQtyAllocations,
  buildStages,
  configProfiles,
  demandProfileMappings,
  functionalTeamDemands,
  projects,
} from "@/db/schema";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth/session";
import { buildAllocationChangeLogValues } from "@/lib/domain/allocation-change-logs";
import { assertBuildMatrixAllocationIsActive } from "@/lib/domain/build-matrix-rules";
import { buildPlanningWarnings } from "@/lib/domain/planning-rules";

type CreateProjectInput = {
  name: string;
  description: string;
};

type CreateBuildStageInput = {
  projectId: string;
  name: string;
  goal: string;
  description: string;
  templateSource?: string;
};

type CreateFunctionalTeamDemandInput = {
  projectId: string;
  buildStageId: string;
  team: string;
  purpose: string;
  requestedQty: number;
  priority: string;
  notes?: string;
};

type CreateConfigProfileInput = {
  projectId: string;
  buildStageId: string;
  productRevision: string;
  testPurpose: string;
  marketOrRegion: string;
  variant: string;
  processVariant: string;
  materialVariant: string;
};

type CreateDemandProfileMappingInput = {
  projectId: string;
  functionalTeamDemandId: string;
  configProfileId: string;
  contributionQty: number;
  weight?: number;
  rationale?: string;
};

type CreateBuildQtyAllocationInput = {
  projectId: string;
  configProfileId: string;
  allocatedQty: number;
  rationale?: string;
};

type CreateBuildMatrixEntryInput = {
  projectId: string;
  buildQtyAllocationId: string;
  buildProcessRoute: string;
  keyMaterialVariant: string;
  processOwnerTeam?: string;
  materialOwnerTeam?: string;
  readinessStatus: "greenlight" | "at_risk" | "blocked";
  notes?: string;
};

export async function listProjectsForCurrentUser() {
  const authContext = await requireUser();

  return db.query.projects.findMany({
    where: and(
      eq(projects.ownerUserId, authContext.userId),
      isNull(projects.deletedAt),
    ),
    orderBy: [asc(projects.createdAt)],
  });
}

export async function getProjectForCurrentUser(projectId: string) {
  const authContext = await requireUser();

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.ownerUserId, authContext.userId),
      isNull(projects.deletedAt),
    ),
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
}

export async function createProject(input: CreateProjectInput) {
  const authContext = await requireUser();

  const [project] = await db
    .insert(projects)
    .values({
      name: input.name,
      description: input.description,
      ownerUserId: authContext.userId,
      status: "draft",
    })
    .returning();

  return project;
}

export async function listBuildStagesForProject(projectId: string) {
  await getProjectForCurrentUser(projectId);

  return db.query.buildStages.findMany({
    where: and(
      eq(buildStages.projectId, projectId),
      isNull(buildStages.deletedAt),
    ),
    orderBy: [asc(buildStages.stageOrder), asc(buildStages.createdAt)],
  });
}

export async function createBuildStage(input: CreateBuildStageInput) {
  await getProjectForCurrentUser(input.projectId);
  const existingStages = await listBuildStagesForProject(input.projectId);

  const [stage] = await db
    .insert(buildStages)
    .values({
      projectId: input.projectId,
      name: input.name,
      goal: input.goal,
      description: input.description,
      stageOrder: existingStages.length + 1,
      templateSource: input.templateSource || null,
      status: "draft",
    })
    .returning();

  return stage;
}

export async function listPlanningRecordsForProject(projectId: string) {
  await getProjectForCurrentUser(projectId);

  const [
    demands,
    profiles,
    mappings,
    allocations,
    matrixEntries,
    allocationLogs,
  ] = await Promise.all([
    db.query.functionalTeamDemands.findMany({
      where: and(
        eq(functionalTeamDemands.projectId, projectId),
        isNull(functionalTeamDemands.deletedAt),
      ),
      orderBy: [
        asc(functionalTeamDemands.createdAt),
        asc(functionalTeamDemands.team),
      ],
    }),
    db.query.configProfiles.findMany({
      where: and(
        eq(configProfiles.projectId, projectId),
        isNull(configProfiles.deletedAt),
      ),
      orderBy: [asc(configProfiles.createdAt)],
    }),
    db.query.demandProfileMappings.findMany({
      where: isNull(demandProfileMappings.deletedAt),
      orderBy: [asc(demandProfileMappings.createdAt)],
    }),
    db.query.buildQtyAllocations.findMany({
      where: and(
        eq(buildQtyAllocations.projectId, projectId),
        isNull(buildQtyAllocations.deletedAt),
      ),
      orderBy: [asc(buildQtyAllocations.createdAt)],
    }),
    db.query.buildMatrixEntries.findMany({
      where: and(
        eq(buildMatrixEntries.projectId, projectId),
        isNull(buildMatrixEntries.deletedAt),
      ),
      orderBy: [asc(buildMatrixEntries.createdAt)],
    }),
    db.query.allocationChangeLogs.findMany({
      where: eq(allocationChangeLogs.projectId, projectId),
      orderBy: [asc(allocationChangeLogs.createdAt)],
    }),
  ]);

  const projectDemandIds = new Set(demands.map((demand) => demand.id));
  const projectProfileIds = new Set(profiles.map((profile) => profile.id));
  const projectMappings = mappings.filter(
    (mapping) =>
      projectDemandIds.has(mapping.functionalTeamDemandId) &&
      projectProfileIds.has(mapping.configProfileId),
  );

  return {
    demands,
    profiles,
    mappings: projectMappings,
    allocations,
    matrixEntries,
    allocationLogs,
    planningWarnings: buildPlanningWarnings({
      allocations,
      demands,
      mappings: projectMappings,
      profiles,
    }),
  };
}

export async function createFunctionalTeamDemand(
  input: CreateFunctionalTeamDemandInput,
) {
  const authContext = await requireUser();
  await getBuildStageForCurrentUser(input.projectId, input.buildStageId);

  const [demand] = await db
    .insert(functionalTeamDemands)
    .values({
      projectId: input.projectId,
      buildStageId: input.buildStageId,
      team: input.team,
      purpose: input.purpose,
      requestedQty: input.requestedQty,
      priority: input.priority,
      ownerUserId: authContext.userId,
      notes: input.notes || "",
    })
    .returning();

  return demand;
}

export async function createConfigProfile(input: CreateConfigProfileInput) {
  await getBuildStageForCurrentUser(input.projectId, input.buildStageId);

  const [profile] = await db
    .insert(configProfiles)
    .values({
      projectId: input.projectId,
      buildStageId: input.buildStageId,
      productRevision: input.productRevision,
      testPurpose: input.testPurpose,
      marketOrRegion: input.marketOrRegion,
      variant: input.variant,
      processVariant: input.processVariant,
      materialVariant: input.materialVariant,
    })
    .returning();

  return profile;
}

export async function createDemandProfileMapping(
  input: CreateDemandProfileMappingInput,
) {
  const [demand, profile] = await Promise.all([
    getFunctionalTeamDemandForCurrentUser(
      input.projectId,
      input.functionalTeamDemandId,
    ),
    getConfigProfileForCurrentUser(input.projectId, input.configProfileId),
  ]);

  if (demand.buildStageId !== profile.buildStageId) {
    throw new Error("Demand and profile must belong to the same build stage");
  }

  const [mapping] = await db
    .insert(demandProfileMappings)
    .values({
      functionalTeamDemandId: input.functionalTeamDemandId,
      configProfileId: input.configProfileId,
      contributionQty: input.contributionQty,
      weight: input.weight ?? null,
      rationale: input.rationale || "",
    })
    .returning();

  return mapping;
}

export async function upsertBuildQtyAllocation(
  input: CreateBuildQtyAllocationInput,
) {
  const authContext = await requireUser();
  const profile = await getConfigProfileForCurrentUser(
    input.projectId,
    input.configProfileId,
  );

  const existingAllocation = await db.query.buildQtyAllocations.findFirst({
    where: and(
      eq(buildQtyAllocations.configProfileId, input.configProfileId),
      eq(buildQtyAllocations.status, "active"),
      isNull(buildQtyAllocations.deletedAt),
    ),
  });

  if (existingAllocation) {
    return db.transaction(async (tx) => {
      const [allocation] = await tx
        .update(buildQtyAllocations)
        .set({
          allocatedQty: input.allocatedQty,
          rationale: input.rationale || "",
          updatedAt: new Date(),
        })
        .where(eq(buildQtyAllocations.id, existingAllocation.id))
        .returning();

      await writeAllocationChangeLogs(tx, {
        actorUserId: authContext.userId,
        allocationId: existingAllocation.id,
        changes: [
          {
            afterValue: allocation.allocatedQty,
            beforeValue: existingAllocation.allocatedQty,
            fieldName: "allocated_qty",
          },
          {
            afterValue: allocation.rationale,
            beforeValue: existingAllocation.rationale,
            fieldName: "rationale",
          },
        ],
        configProfileId: allocation.configProfileId,
        projectId: allocation.projectId,
        reason: input.rationale || "Allocation updated",
        stageId: allocation.buildStageId,
      });

      return allocation;
    });
  }

  return db.transaction(async (tx) => {
    const [allocation] = await tx
      .insert(buildQtyAllocations)
      .values({
        projectId: input.projectId,
        buildStageId: profile.buildStageId,
        configProfileId: input.configProfileId,
        allocatedQty: input.allocatedQty,
        rationale: input.rationale || "",
        status: "active",
      })
      .returning();

    await writeAllocationChangeLogs(tx, {
      actorUserId: authContext.userId,
      allocationId: allocation.id,
      changes: [
        {
          afterValue: allocation.allocatedQty,
          beforeValue: null,
          fieldName: "allocated_qty",
        },
        {
          afterValue: allocation.rationale,
          beforeValue: null,
          fieldName: "rationale",
        },
        {
          afterValue: allocation.status,
          beforeValue: null,
          fieldName: "status",
        },
      ],
      configProfileId: allocation.configProfileId,
      projectId: allocation.projectId,
      reason: input.rationale || "Allocation created",
      stageId: allocation.buildStageId,
    });

    return allocation;
  });
}

export async function createBuildMatrixEntry(
  input: CreateBuildMatrixEntryInput,
) {
  const allocation = await getBuildQtyAllocationForCurrentUser(
    input.projectId,
    input.buildQtyAllocationId,
  );

  assertBuildMatrixAllocationIsActive(allocation);

  const [entry] = await db
    .insert(buildMatrixEntries)
    .values({
      projectId: input.projectId,
      buildStageId: allocation.buildStageId,
      configProfileId: allocation.configProfileId,
      buildQtyAllocationId: input.buildQtyAllocationId,
      buildProcessRoute: input.buildProcessRoute,
      keyMaterialVariant: input.keyMaterialVariant,
      processOwnerTeam: input.processOwnerTeam || "",
      materialOwnerTeam: input.materialOwnerTeam || "",
      readinessStatus: input.readinessStatus,
      notes: input.notes || "",
    })
    .returning();

  return entry;
}

async function writeAllocationChangeLogs(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    actorUserId: string;
    allocationId: string;
    changes: Array<{
      afterValue: unknown;
      beforeValue: unknown;
      fieldName: string;
    }>;
    configProfileId: string;
    projectId: string;
    reason: string;
    stageId: string;
  },
) {
  const changeLogValues = buildAllocationChangeLogValues(input);

  if (changeLogValues.length === 0) {
    return;
  }

  await tx.insert(allocationChangeLogs).values(changeLogValues);
}

async function getBuildStageForCurrentUser(projectId: string, stageId: string) {
  await getProjectForCurrentUser(projectId);

  const stage = await db.query.buildStages.findFirst({
    where: and(
      eq(buildStages.id, stageId),
      eq(buildStages.projectId, projectId),
      isNull(buildStages.deletedAt),
    ),
  });

  if (!stage) {
    throw new Error("Build stage not found");
  }

  return stage;
}

async function getFunctionalTeamDemandForCurrentUser(
  projectId: string,
  demandId: string,
) {
  await getProjectForCurrentUser(projectId);

  const demand = await db.query.functionalTeamDemands.findFirst({
    where: and(
      eq(functionalTeamDemands.id, demandId),
      eq(functionalTeamDemands.projectId, projectId),
      isNull(functionalTeamDemands.deletedAt),
    ),
  });

  if (!demand) {
    throw new Error("Functional team demand not found");
  }

  return demand;
}

async function getConfigProfileForCurrentUser(
  projectId: string,
  profileId: string,
) {
  await getProjectForCurrentUser(projectId);

  const profile = await db.query.configProfiles.findFirst({
    where: and(
      eq(configProfiles.id, profileId),
      eq(configProfiles.projectId, projectId),
      isNull(configProfiles.deletedAt),
    ),
  });

  if (!profile) {
    throw new Error("Config profile not found");
  }

  return profile;
}

async function getBuildQtyAllocationForCurrentUser(
  projectId: string,
  allocationId: string,
) {
  await getProjectForCurrentUser(projectId);

  const allocation = await db.query.buildQtyAllocations.findFirst({
    where: and(
      eq(buildQtyAllocations.id, allocationId),
      eq(buildQtyAllocations.projectId, projectId),
      isNull(buildQtyAllocations.deletedAt),
    ),
  });

  if (!allocation) {
    throw new Error("Build qty allocation not found");
  }

  return allocation;
}
