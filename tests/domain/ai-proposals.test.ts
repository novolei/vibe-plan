import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  aiAgents,
  aiAuditEvents,
  aiOperations,
  aiProposals,
  aiRuns,
  buildStages,
  projects,
} from "@/db/schema";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run AI proposal tests.");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

after(async () => {
  await pool.end();
});

describe("AI proposal audit model", () => {
  it("stores proposal source, rationale, confidence, and pending operation payload", async (t) => {
    const fixture = await seedAiProposalFixture("source-rationale");

    t.after(async () => {
      await cleanupFixture(fixture.project.id, fixture.agent.id);
    });

    const [proposal] = await db
      .insert(aiProposals)
      .values({
        aiRunId: fixture.run.id,
        buildStageId: fixture.stage.id,
        confidence: 72,
        projectId: fixture.project.id,
        proposalType: "stage_summary",
        rationale: "Synthesized from demand and matrix records.",
        sourceContext: {
          demandIds: ["demand-1", "demand-2"],
          stageName: fixture.stage.name,
        },
        summary: "EVT demand is covered with one at-risk matrix entry.",
        title: "EVT planning summary",
      })
      .returning();
    const [operation] = await db
      .insert(aiOperations)
      .values({
        aiProposalId: proposal.id,
        confidence: 72,
        inputPayload: {
          summary: "EVT demand is covered with one at-risk matrix entry.",
        },
        operationType: "generate_summary",
        rationale: "Human review required before baseline usage.",
        targetId: fixture.stage.id,
        targetType: "build_stage",
      })
      .returning();

    assert.deepEqual(proposal.sourceContext, {
      demandIds: ["demand-1", "demand-2"],
      stageName: fixture.stage.name,
    });
    assert.equal(
      proposal.rationale,
      "Synthesized from demand and matrix records.",
    );
    assert.equal(proposal.confidence, 72);
    assert.deepEqual(operation.inputPayload, {
      summary: "EVT demand is covered with one at-risk matrix entry.",
    });
    assert.equal(operation.validationStatus, "pending");
    assert.equal(operation.executionStatus, "pending");
  });

  it("records human disposition and audit event without applying operations", async (t) => {
    const fixture = await seedAiProposalFixture("human-disposition");

    t.after(async () => {
      await cleanupFixture(fixture.project.id, fixture.agent.id);
    });

    const [proposal] = await db
      .insert(aiProposals)
      .values({
        aiRunId: fixture.run.id,
        buildStageId: fixture.stage.id,
        confidence: 65,
        projectId: fixture.project.id,
        proposalType: "stage_summary",
        rationale: "Draft summary only.",
        sourceContext: { stageId: fixture.stage.id },
        summary: "DVT allocation needs planner confirmation.",
        title: "DVT planning summary",
      })
      .returning();
    const [operation] = await db
      .insert(aiOperations)
      .values({
        aiProposalId: proposal.id,
        inputPayload: {
          summary: "DVT allocation needs planner confirmation.",
        },
        operationType: "generate_summary",
        targetId: fixture.stage.id,
        targetType: "build_stage",
      })
      .returning();
    const reviewedAt = new Date();

    const [reviewedProposal] = await db
      .update(aiProposals)
      .set({
        humanDisposition: "accepted",
        reviewedAt,
        reviewerUserId: "reviewer-1",
        reviewNotes: "Useful summary, keep as planning note.",
        status: "accepted",
        updatedAt: reviewedAt,
      })
      .where(eq(aiProposals.id, proposal.id))
      .returning();

    const [auditEvent] = await db
      .insert(aiAuditEvents)
      .values({
        actorId: "reviewer-1",
        actorType: "human",
        aiOperationId: operation.id,
        aiProposalId: proposal.id,
        aiRunId: fixture.run.id,
        buildStageId: fixture.stage.id,
        eventPayload: {
          disposition: "accepted",
          reviewNotes: "Useful summary, keep as planning note.",
        },
        eventType: "proposal_reviewed",
        projectId: fixture.project.id,
      })
      .returning();
    const [storedOperation] = await db
      .select()
      .from(aiOperations)
      .where(eq(aiOperations.id, operation.id));

    assert.equal(reviewedProposal.humanDisposition, "accepted");
    assert.equal(reviewedProposal.reviewerUserId, "reviewer-1");
    assert.ok(reviewedProposal.reviewedAt);
    assert.equal(auditEvent.eventType, "proposal_reviewed");
    assert.equal(storedOperation?.executionStatus, "pending");
  });

  it("rejects proposal confidence outside 0 to 100", async (t) => {
    const fixture = await seedAiProposalFixture("confidence-range");

    t.after(async () => {
      await cleanupFixture(fixture.project.id, fixture.agent.id);
    });

    await assert.rejects(
      () =>
        db
          .insert(aiProposals)
          .values({
            buildStageId: fixture.stage.id,
            confidence: 101,
            projectId: fixture.project.id,
            proposalType: "stage_summary",
            rationale: "Invalid confidence.",
            sourceContext: {},
            summary: "Invalid confidence must fail.",
            title: "Invalid confidence",
          })
          .returning(),
      (error) => hasDatabaseCode(error, "23514"),
    );
  });
});

async function seedAiProposalFixture(suffix: string) {
  const runId = `${suffix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

  const [project] = await db
    .insert(projects)
    .values({
      description: `AI proposal test ${runId}`,
      name: `AI proposal test ${runId}`,
      ownerUserId: "test-user",
      status: "draft",
    })
    .returning();
  const [stage] = await db
    .insert(buildStages)
    .values({
      description: "AI proposal validation stage",
      goal: "Validate proposal audit model",
      name: "EVT",
      projectId: project.id,
      stageOrder: 1,
      status: "draft",
    })
    .returning();
  const [agent] = await db
    .insert(aiAgents)
    .values({
      description: "Test planning copilot",
      model: `test-model-${runId}`,
      name: "Test Planning Copilot",
      provider: "test",
      status: "active",
    })
    .returning();
  const [run] = await db
    .insert(aiRuns)
    .values({
      aiAgentId: agent.id,
      buildStageId: stage.id,
      contextSummary: "Stage summary test context.",
      inputRefs: [
        { id: project.id, type: "project" },
        { id: stage.id, type: "build_stage" },
      ],
      model: agent.model,
      outputSummary: "Draft output.",
      projectId: project.id,
      provider: agent.provider,
      status: "succeeded",
    })
    .returning();

  return { agent, project, run, stage };
}

async function cleanupFixture(projectId: string, agentId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
  await db.delete(aiAgents).where(eq(aiAgents.id, agentId));
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
