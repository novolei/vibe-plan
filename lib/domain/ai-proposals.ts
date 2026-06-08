import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import {
  aiAgents,
  aiAuditEvents,
  aiOperations,
  aiProposals,
  aiRuns,
  buildStages,
} from "@/db/schema";
import { db } from "@/db/client";
import { requireUser } from "@/lib/auth/session";
import { getProjectForCurrentUser } from "@/lib/domain/projects";

export type AIOperationInput = {
  confidence?: number;
  inputPayload: Record<string, unknown>;
  operationType: string;
  rationale?: string;
  targetId?: string;
  targetType: string;
};

export type CreateAIRunInput = {
  aiAgentId?: string;
  buildStageId?: string;
  contextSummary: string;
  inputRefs: Array<Record<string, string>>;
  model: string;
  outputSummary?: string;
  projectId: string;
  provider: string;
  status?: "failed" | "running" | "succeeded";
};

export type CreateAIProposalInput = {
  aiRunId?: string;
  buildStageId?: string;
  confidence?: number;
  operations?: AIOperationInput[];
  projectId: string;
  proposalType: string;
  rationale: string;
  sourceContext: Record<string, unknown>;
  summary: string;
  title: string;
};

export type ReviewAIProposalInput = {
  disposition: "accepted" | "rejected" | "revised";
  projectId: string;
  proposalId: string;
  reviewNotes?: string;
};

export async function createAiRun(input: CreateAIRunInput) {
  const authContext = await requireUser();
  await getProjectForCurrentUser(input.projectId);

  if (input.buildStageId) {
    await assertBuildStageInProject(input.projectId, input.buildStageId);
  }

  const [run] = await db
    .insert(aiRuns)
    .values({
      aiAgentId: input.aiAgentId ?? null,
      buildStageId: input.buildStageId ?? null,
      completedAt:
        input.status === "succeeded" || input.status === "failed"
          ? new Date()
          : null,
      contextSummary: input.contextSummary,
      inputRefs: input.inputRefs,
      model: input.model,
      outputSummary: input.outputSummary ?? "",
      projectId: input.projectId,
      provider: input.provider,
      status: input.status ?? "running",
    })
    .returning();

  await writeAiAuditEvent({
    actorId: authContext.userId,
    actorType: "human",
    aiAgentId: run.aiAgentId ?? undefined,
    aiRunId: run.id,
    buildStageId: run.buildStageId ?? undefined,
    eventPayload: {
      model: run.model,
      provider: run.provider,
      status: run.status,
    },
    eventType: "run_started",
    projectId: input.projectId,
  });

  if (run.status === "succeeded") {
    await writeAiAuditEvent({
      actorId: authContext.userId,
      actorType: "human",
      aiAgentId: run.aiAgentId ?? undefined,
      aiRunId: run.id,
      buildStageId: run.buildStageId ?? undefined,
      eventPayload: {
        outputSummary: run.outputSummary,
      },
      eventType: "run_succeeded",
      projectId: input.projectId,
    });
  }

  return run;
}

export async function createAiProposal(input: CreateAIProposalInput) {
  const authContext = await requireUser();
  await getProjectForCurrentUser(input.projectId);

  if (input.buildStageId) {
    await assertBuildStageInProject(input.projectId, input.buildStageId);
  }

  return db.transaction(async (tx) => {
    const [proposal] = await tx
      .insert(aiProposals)
      .values({
        aiRunId: input.aiRunId ?? null,
        buildStageId: input.buildStageId ?? null,
        confidence: input.confidence ?? null,
        proposalType: input.proposalType,
        projectId: input.projectId,
        rationale: input.rationale,
        sourceContext: input.sourceContext,
        status: "pending",
        summary: input.summary,
        title: input.title,
      })
      .returning();

    const operations =
      input.operations && input.operations.length > 0
        ? await tx
            .insert(aiOperations)
            .values(
              input.operations.map((operation) => ({
                aiProposalId: proposal.id,
                confidence: operation.confidence ?? null,
                executionStatus: "pending" as const,
                inputPayload: operation.inputPayload,
                operationType: operation.operationType,
                rationale: operation.rationale ?? "",
                targetId: operation.targetId ?? null,
                targetType: operation.targetType,
                validationStatus: "pending" as const,
              })),
            )
            .returning()
        : [];

    await tx.insert(aiAuditEvents).values({
      actorId: authContext.userId,
      actorType: "human",
      aiProposalId: proposal.id,
      aiRunId: proposal.aiRunId,
      buildStageId: proposal.buildStageId,
      eventPayload: {
        operationCount: operations.length,
        proposalType: proposal.proposalType,
      },
      eventType: "proposal_created",
      projectId: proposal.projectId,
    });

    return {
      operations,
      proposal,
    };
  });
}

export async function reviewAiProposal(input: ReviewAIProposalInput) {
  const authContext = await requireUser();
  await getProjectForCurrentUser(input.projectId);

  const reviewedAt = new Date();
  const [proposal] = await db
    .update(aiProposals)
    .set({
      humanDisposition: input.disposition,
      reviewedAt,
      reviewerUserId: authContext.userId,
      reviewNotes: input.reviewNotes ?? "",
      status: input.disposition,
      updatedAt: reviewedAt,
    })
    .where(
      and(
        eq(aiProposals.id, input.proposalId),
        eq(aiProposals.projectId, input.projectId),
      ),
    )
    .returning();

  if (!proposal) {
    throw new Error("AI proposal not found");
  }

  await writeAiAuditEvent({
    actorId: authContext.userId,
    actorType: "human",
    aiProposalId: proposal.id,
    aiRunId: proposal.aiRunId ?? undefined,
    buildStageId: proposal.buildStageId ?? undefined,
    eventPayload: {
      disposition: input.disposition,
      reviewNotes: input.reviewNotes ?? "",
    },
    eventType: "proposal_reviewed",
    projectId: input.projectId,
  });

  return proposal;
}

export async function listAiProposalsForProject(projectId: string) {
  await getProjectForCurrentUser(projectId);

  const [proposals, operations] = await Promise.all([
    db.query.aiProposals.findMany({
      where: eq(aiProposals.projectId, projectId),
      orderBy: [asc(aiProposals.createdAt)],
    }),
    db.query.aiOperations.findMany({
      orderBy: [asc(aiOperations.createdAt)],
    }),
  ]);

  const proposalIds = new Set(proposals.map((proposal) => proposal.id));

  return {
    aiOperations: operations.filter((operation) =>
      proposalIds.has(operation.aiProposalId),
    ),
    aiProposals: proposals,
  };
}

async function writeAiAuditEvent(input: {
  actorId: string;
  actorType: "ai_agent" | "human" | "system";
  aiAgentId?: string;
  aiOperationId?: string;
  aiProposalId?: string;
  aiRunId?: string;
  buildStageId?: string;
  eventPayload: Record<string, unknown>;
  eventType:
    | "operation_applied"
    | "operation_failed"
    | "operation_validated"
    | "proposal_created"
    | "proposal_reviewed"
    | "run_failed"
    | "run_started"
    | "run_succeeded";
  projectId: string;
}) {
  await db.insert(aiAuditEvents).values({
    actorId: input.actorId,
    actorType: input.actorType,
    aiAgentId: input.aiAgentId ?? null,
    aiOperationId: input.aiOperationId ?? null,
    aiProposalId: input.aiProposalId ?? null,
    aiRunId: input.aiRunId ?? null,
    buildStageId: input.buildStageId ?? null,
    eventPayload: input.eventPayload,
    eventType: input.eventType,
    projectId: input.projectId,
  });
}

async function assertBuildStageInProject(
  projectId: string,
  buildStageId: string,
) {
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
}

export async function ensureDefaultAiAgent(input: {
  model: string;
  provider: string;
}) {
  const existingAgent = await db.query.aiAgents.findFirst({
    where: and(
      eq(aiAgents.provider, input.provider),
      eq(aiAgents.model, input.model),
    ),
  });

  if (existingAgent) {
    return existingAgent;
  }

  const [agent] = await db
    .insert(aiAgents)
    .values({
      description: "Default planning copilot agent for NPI build planning.",
      model: input.model,
      name: "Planning Copilot",
      provider: input.provider,
      status: "active",
    })
    .returning();

  return agent;
}
