import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import {
  blockers,
  buildMatrixEntries,
  buildStages,
  readinessAuditLogs,
  readinessSignoffs,
  readinessSignals,
} from "@/db/schema";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth/session";
import { getProjectForCurrentUser } from "@/lib/domain/projects";
import {
  buildReadinessWarnings,
  type BlockerStatus,
  type ReadinessStatus,
  type ReadinessTargetType,
} from "@/lib/domain/readiness-rules";

export {
  buildReadinessWarnings,
  computeWorstChildReadiness,
  type BlockerStatus,
  type ReadinessStatus,
  type ReadinessTargetType,
} from "@/lib/domain/readiness-rules";

export type CreateReadinessSignalInput = {
  ownerTeam?: string;
  projectId: string;
  rationale?: string;
  status: ReadinessStatus;
  summary: string;
  targetId: string;
  targetType: ReadinessTargetType;
};

export type CreateBlockerInput = {
  decisionNeeded?: boolean;
  dueDate?: Date;
  impact: string;
  mitigation?: string;
  ownerTeam: string;
  projectId: string;
  readinessSignalId?: string;
  severity: string;
  status: BlockerStatus;
  targetId: string;
  targetType: ReadinessTargetType;
  title: string;
};

export type CreateReadinessSignoffInput = {
  disposition: "accepted_risk" | "approved" | "rejected";
  notes?: string;
  projectId: string;
  readinessSignalId: string;
};

export async function listReadinessRecordsForProject(projectId: string) {
  await getProjectForCurrentUser(projectId);

  const [signals, projectBlockers, signoffs, auditLogs] = await Promise.all([
    db.query.readinessSignals.findMany({
      where: and(
        eq(readinessSignals.projectId, projectId),
        isNull(readinessSignals.deletedAt),
      ),
      orderBy: [asc(readinessSignals.createdAt)],
    }),
    db.query.blockers.findMany({
      where: and(eq(blockers.projectId, projectId), isNull(blockers.deletedAt)),
      orderBy: [asc(blockers.createdAt)],
    }),
    db.query.readinessSignoffs.findMany({
      where: eq(readinessSignoffs.projectId, projectId),
      orderBy: [asc(readinessSignoffs.createdAt)],
    }),
    db.query.readinessAuditLogs.findMany({
      where: eq(readinessAuditLogs.projectId, projectId),
      orderBy: [asc(readinessAuditLogs.createdAt)],
    }),
  ]);

  return {
    blockers: projectBlockers,
    readinessAuditLogs: auditLogs,
    readinessSignoffs: signoffs,
    readinessSignals: signals,
    readinessWarnings: buildReadinessWarnings({
      blockers: projectBlockers,
      readinessSignals: signals,
    }),
  };
}

export async function createReadinessSignal(input: CreateReadinessSignalInput) {
  const authContext = await requireUser();
  const target = await assertReadinessTarget(input);

  return db.transaction(async (tx) => {
    const [signal] = await tx
      .insert(readinessSignals)
      .values({
        buildStageId: target.buildStageId,
        ownerTeam: input.ownerTeam || "",
        ownerUserId: authContext.userId,
        projectId: input.projectId,
        rationale: input.rationale || "",
        source: "manual",
        status: input.status,
        summary: input.summary,
        targetId: input.targetId,
        targetType: input.targetType,
      })
      .returning();

    await tx.insert(readinessAuditLogs).values({
      actorUserId: authContext.userId,
      afterValue: {
        status: signal.status,
        targetId: signal.targetId,
        targetType: signal.targetType,
      },
      buildStageId: signal.buildStageId,
      eventType: "readiness_signal_created",
      fieldName: "status",
      projectId: signal.projectId,
      readinessSignalId: signal.id,
      reason: signal.rationale || signal.summary,
    });

    return signal;
  });
}

export async function createBlocker(input: CreateBlockerInput) {
  const authContext = await requireUser();
  const target = await assertReadinessTarget(input);
  const signal = input.readinessSignalId
    ? await getReadinessSignalForProject(
        input.projectId,
        input.readinessSignalId,
      )
    : null;

  if (signal && signal.targetId !== input.targetId) {
    throw new Error("Blocker target must match readiness signal target");
  }

  return db.transaction(async (tx) => {
    const [blocker] = await tx
      .insert(blockers)
      .values({
        buildStageId: target.buildStageId,
        decisionNeeded: input.decisionNeeded ?? false,
        dueDate: input.dueDate ?? null,
        impact: input.impact,
        mitigation: input.mitigation || "",
        ownerTeam: input.ownerTeam,
        ownerUserId: authContext.userId,
        projectId: input.projectId,
        readinessSignalId: signal?.id ?? null,
        severity: input.severity,
        status: input.status,
        targetId: input.targetId,
        targetType: input.targetType,
        title: input.title,
      })
      .returning();

    await tx.insert(readinessAuditLogs).values({
      actorUserId: authContext.userId,
      afterValue: {
        severity: blocker.severity,
        status: blocker.status,
        title: blocker.title,
      },
      blockerId: blocker.id,
      buildStageId: blocker.buildStageId,
      eventType: "blocker_created",
      fieldName: "status",
      projectId: blocker.projectId,
      readinessSignalId: blocker.readinessSignalId,
      reason: blocker.mitigation || blocker.impact,
    });

    return blocker;
  });
}

export async function createReadinessSignoff(
  input: CreateReadinessSignoffInput,
) {
  const authContext = await requireUser();
  const signal = await getReadinessSignalForProject(
    input.projectId,
    input.readinessSignalId,
  );

  return db.transaction(async (tx) => {
    const [signoff] = await tx
      .insert(readinessSignoffs)
      .values({
        disposition: input.disposition,
        notes: input.notes || "",
        projectId: input.projectId,
        readinessSignalId: signal.id,
        signerUserId: authContext.userId,
      })
      .returning();

    await tx.insert(readinessAuditLogs).values({
      actorUserId: authContext.userId,
      afterValue: {
        disposition: signoff.disposition,
        readinessSignalId: signal.id,
        signalStatus: signal.status,
      },
      buildStageId: signal.buildStageId,
      eventType: "readiness_signoff_created",
      fieldName: "disposition",
      projectId: signal.projectId,
      readinessSignalId: signal.id,
      readinessSignoffId: signoff.id,
      reason: signoff.notes,
    });

    return signoff;
  });
}

async function assertReadinessTarget(input: {
  projectId: string;
  targetId: string;
  targetType: ReadinessTargetType;
}) {
  await getProjectForCurrentUser(input.projectId);

  if (input.targetType === "project") {
    const project = await getProjectForCurrentUser(input.projectId);

    if (project.id !== input.targetId) {
      throw new Error("Readiness target project does not match");
    }

    return { buildStageId: null };
  }

  if (input.targetType === "build_stage") {
    const stage = await db.query.buildStages.findFirst({
      where: and(
        eq(buildStages.id, input.targetId),
        eq(buildStages.projectId, input.projectId),
        isNull(buildStages.deletedAt),
      ),
    });

    if (!stage) {
      throw new Error("Readiness target stage not found");
    }

    return { buildStageId: stage.id };
  }

  const matrixEntry = await db.query.buildMatrixEntries.findFirst({
    where: and(
      eq(buildMatrixEntries.id, input.targetId),
      eq(buildMatrixEntries.projectId, input.projectId),
      isNull(buildMatrixEntries.deletedAt),
    ),
  });

  if (!matrixEntry) {
    throw new Error("Readiness target matrix entry not found");
  }

  return { buildStageId: matrixEntry.buildStageId };
}

async function getReadinessSignalForProject(
  projectId: string,
  readinessSignalId: string,
) {
  await getProjectForCurrentUser(projectId);

  const signal = await db.query.readinessSignals.findFirst({
    where: and(
      eq(readinessSignals.id, readinessSignalId),
      eq(readinessSignals.projectId, projectId),
      isNull(readinessSignals.deletedAt),
    ),
  });

  if (!signal) {
    throw new Error("Readiness signal not found");
  }

  return signal;
}
