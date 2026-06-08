import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import {
  blockers,
  buildMatrixEntries,
  buildQtyAllocations,
  buildStages,
  configProfiles,
  projects,
  readinessSignals,
  scheduleAuditLogs,
  scheduleDependencies,
  scheduleTaskLinks,
  scheduleTasks,
} from "@/db/schema";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth/session";
import { getProjectForCurrentUser } from "@/lib/domain/projects";
import {
  assertScheduleTaskHasActiveLink,
  buildScheduleDependencyWarnings,
  type ScheduleDependencyType,
  type ScheduleTaskStatus,
} from "@/lib/domain/schedule-rules";

export {
  assertScheduleTaskHasActiveLink,
  buildScheduleDependencyWarnings,
  hasFinishToStartConflict,
  type ScheduleDependencyType,
  type ScheduleTaskStatus,
} from "@/lib/domain/schedule-rules";

export type ScheduleLinkedObjectType =
  | "blocker"
  | "build_matrix_entry"
  | "build_qty_allocation"
  | "build_stage"
  | "config_profile"
  | "project"
  | "readiness_signal";

export type CreateScheduleTaskInput = {
  buildStageId: string;
  description?: string;
  link: {
    linkedObjectId: string;
    linkedObjectType: ScheduleLinkedObjectType;
  };
  plannedEndDate: Date;
  plannedStartDate: Date;
  priority?: string;
  projectId: string;
  status?: ScheduleTaskStatus;
  title: string;
};

export type CreateScheduleDependencyInput = {
  dependencyType: ScheduleDependencyType;
  lagDays?: number;
  notes?: string;
  predecessorTaskId: string;
  projectId: string;
  successorTaskId: string;
};

export async function listScheduleRecordsForProject(projectId: string) {
  await getProjectForCurrentUser(projectId);

  const [tasks, links, dependencies, auditLogs] = await Promise.all([
    db.query.scheduleTasks.findMany({
      where: and(
        eq(scheduleTasks.projectId, projectId),
        isNull(scheduleTasks.deletedAt),
      ),
      orderBy: [asc(scheduleTasks.plannedStartDate), asc(scheduleTasks.title)],
    }),
    db.query.scheduleTaskLinks.findMany({
      where: and(
        eq(scheduleTaskLinks.projectId, projectId),
        isNull(scheduleTaskLinks.deletedAt),
      ),
      orderBy: [asc(scheduleTaskLinks.createdAt)],
    }),
    db.query.scheduleDependencies.findMany({
      where: and(
        eq(scheduleDependencies.projectId, projectId),
        isNull(scheduleDependencies.deletedAt),
      ),
      orderBy: [asc(scheduleDependencies.createdAt)],
    }),
    db.query.scheduleAuditLogs.findMany({
      where: eq(scheduleAuditLogs.projectId, projectId),
      orderBy: [asc(scheduleAuditLogs.createdAt)],
    }),
  ]);

  return {
    scheduleAuditLogs: auditLogs,
    scheduleDependencies: dependencies,
    scheduleLinks: links,
    scheduleTasks: tasks,
    scheduleWarnings: buildScheduleDependencyWarnings({
      dependencies,
      tasks,
    }),
  };
}

export async function createScheduleTask(input: CreateScheduleTaskInput) {
  const authContext = await requireUser();
  await getBuildStageForProject(input.projectId, input.buildStageId);
  await assertScheduleLinkedObject(input.projectId, input.link);
  assertScheduleTaskHasActiveLink([{ deletedAt: null }]);

  return db.transaction(async (tx) => {
    const plannedStart = new Date(input.plannedStartDate);
    const plannedEnd = new Date(input.plannedEndDate);
    const [task] = await tx
      .insert(scheduleTasks)
      .values({
        buildStageId: input.buildStageId,
        description: input.description || "",
        durationDays: durationInDays(plannedStart, plannedEnd),
        ownerUserId: authContext.userId,
        plannedEndDate: plannedEnd,
        plannedStartDate: plannedStart,
        priority: input.priority || "normal",
        projectId: input.projectId,
        status: input.status || "todo",
        title: input.title,
      })
      .returning();
    const [link] = await tx
      .insert(scheduleTaskLinks)
      .values({
        linkedObjectId: input.link.linkedObjectId,
        linkedObjectType: input.link.linkedObjectType,
        projectId: input.projectId,
        scheduleTaskId: task.id,
      })
      .returning();

    await tx.insert(scheduleAuditLogs).values({
      actorUserId: authContext.userId,
      afterValue: {
        link: {
          linkedObjectId: link.linkedObjectId,
          linkedObjectType: link.linkedObjectType,
        },
        plannedEndDate: task.plannedEndDate,
        plannedStartDate: task.plannedStartDate,
        status: task.status,
        title: task.title,
      },
      buildStageId: task.buildStageId,
      changedField: "task_created",
      projectId: task.projectId,
      reason: task.description || task.title,
      scheduleTaskId: task.id,
    });

    return { link, task };
  });
}

export async function createScheduleDependency(
  input: CreateScheduleDependencyInput,
) {
  const authContext = await requireUser();
  const [predecessor, successor] = await Promise.all([
    getScheduleTaskForProject(input.projectId, input.predecessorTaskId),
    getScheduleTaskForProject(input.projectId, input.successorTaskId),
  ]);

  if (predecessor.id === successor.id) {
    throw new Error("Schedule dependency cannot link a task to itself");
  }

  const [dependency] = await db
    .insert(scheduleDependencies)
    .values({
      createdByUserId: authContext.userId,
      dependencyType: input.dependencyType,
      lagDays: input.lagDays ?? 0,
      notes: input.notes || "",
      predecessorTaskId: predecessor.id,
      projectId: input.projectId,
      successorTaskId: successor.id,
    })
    .returning();

  await db.insert(scheduleAuditLogs).values({
    actorUserId: authContext.userId,
    afterValue: {
      dependencyType: dependency.dependencyType,
      lagDays: dependency.lagDays,
      predecessorTaskId: predecessor.id,
      successorTaskId: successor.id,
    },
    buildStageId: successor.buildStageId,
    changedField: "dependency_created",
    projectId: input.projectId,
    reason: input.notes || "",
    scheduleDependencyId: dependency.id,
  });

  return dependency;
}

async function getBuildStageForProject(
  projectId: string,
  buildStageId: string,
) {
  await getProjectForCurrentUser(projectId);

  const stage = await db.query.buildStages.findFirst({
    where: and(
      eq(buildStages.id, buildStageId),
      eq(buildStages.projectId, projectId),
      isNull(buildStages.deletedAt),
    ),
  });

  if (!stage) {
    throw new Error("Build stage not found");
  }

  return stage;
}

async function getScheduleTaskForProject(projectId: string, taskId: string) {
  await getProjectForCurrentUser(projectId);

  const task = await db.query.scheduleTasks.findFirst({
    where: and(
      eq(scheduleTasks.id, taskId),
      eq(scheduleTasks.projectId, projectId),
      isNull(scheduleTasks.deletedAt),
    ),
  });

  if (!task) {
    throw new Error("Schedule task not found");
  }

  return task;
}

async function assertScheduleLinkedObject(
  projectId: string,
  link: {
    linkedObjectId: string;
    linkedObjectType: ScheduleLinkedObjectType;
  },
) {
  await getProjectForCurrentUser(projectId);

  if (link.linkedObjectType === "project") {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, link.linkedObjectId),
        isNull(projects.deletedAt),
      ),
    });

    if (!project || project.id !== projectId) {
      throw new Error("Linked project not found");
    }

    return;
  }

  const lookupByType = {
    blocker: () =>
      db.query.blockers.findFirst({
        where: and(
          eq(blockers.id, link.linkedObjectId),
          eq(blockers.projectId, projectId),
          isNull(blockers.deletedAt),
        ),
      }),
    build_matrix_entry: () =>
      db.query.buildMatrixEntries.findFirst({
        where: and(
          eq(buildMatrixEntries.id, link.linkedObjectId),
          eq(buildMatrixEntries.projectId, projectId),
          isNull(buildMatrixEntries.deletedAt),
        ),
      }),
    build_qty_allocation: () =>
      db.query.buildQtyAllocations.findFirst({
        where: and(
          eq(buildQtyAllocations.id, link.linkedObjectId),
          eq(buildQtyAllocations.projectId, projectId),
          isNull(buildQtyAllocations.deletedAt),
        ),
      }),
    build_stage: () =>
      db.query.buildStages.findFirst({
        where: and(
          eq(buildStages.id, link.linkedObjectId),
          eq(buildStages.projectId, projectId),
          isNull(buildStages.deletedAt),
        ),
      }),
    config_profile: () =>
      db.query.configProfiles.findFirst({
        where: and(
          eq(configProfiles.id, link.linkedObjectId),
          eq(configProfiles.projectId, projectId),
          isNull(configProfiles.deletedAt),
        ),
      }),
    readiness_signal: () =>
      db.query.readinessSignals.findFirst({
        where: and(
          eq(readinessSignals.id, link.linkedObjectId),
          eq(readinessSignals.projectId, projectId),
          isNull(readinessSignals.deletedAt),
        ),
      }),
  } satisfies Record<
    Exclude<ScheduleLinkedObjectType, "project">,
    () => Promise<unknown>
  >;

  const record = await lookupByType[link.linkedObjectType]();

  if (!record) {
    throw new Error("Linked schedule object not found");
  }
}

function durationInDays(start: Date, end: Date) {
  const millisPerDay = 24 * 60 * 60 * 1000;

  return Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / millisPerDay),
  );
}
