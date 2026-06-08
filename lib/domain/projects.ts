import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { buildStages, projects } from "@/db/schema";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth/session";

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

