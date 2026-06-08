import "server-only";

import { createAIProvider } from "@/lib/ai/provider-factory";
import {
  createAiProposal,
  createAiRun,
  ensureDefaultAiAgent,
} from "@/lib/domain/ai-proposals";
import {
  getProjectForCurrentUser,
  listBuildStagesForProject,
  listPlanningRecordsForProject,
} from "@/lib/domain/projects";

export async function generateStageSummaryProposal(input: {
  buildStageId: string;
  projectId: string;
}) {
  const [project, stages, planningRecords] = await Promise.all([
    getProjectForCurrentUser(input.projectId),
    listBuildStagesForProject(input.projectId),
    listPlanningRecordsForProject(input.projectId),
  ]);
  const stage = stages.find((candidate) => candidate.id === input.buildStageId);

  if (!stage) {
    throw new Error("Build stage not found");
  }

  const provider = createAIProvider();
  const context = buildStageSummaryContext({
    planningRecords,
    project,
    stage,
  });
  const response = await provider.generate({
    prompt: [
      "Summarize the NPI build stage planning state.",
      "Return a concise management-facing summary with demand, allocation, build matrix, and readiness risks.",
      "",
      JSON.stringify(context, null, 2),
    ].join("\n"),
    responseFormat: "text",
    system:
      "You are Vibe Plan Planning Copilot. You create reviewable planning proposals, not approved baselines.",
  });
  const agent = await ensureDefaultAiAgent({
    model: response.model,
    provider: response.provider,
  });
  const run = await createAiRun({
    aiAgentId: agent.id,
    buildStageId: stage.id,
    contextSummary: `Stage summary proposal for ${project.name} / ${stage.name}.`,
    inputRefs: [
      { id: project.id, type: "project" },
      { id: stage.id, type: "build_stage" },
    ],
    model: response.model,
    outputSummary: response.text,
    projectId: project.id,
    provider: response.provider,
    status: "succeeded",
  });

  return createAiProposal({
    aiRunId: run.id,
    buildStageId: stage.id,
    confidence: 70,
    operations: [
      {
        confidence: 70,
        inputPayload: {
          summary: response.text,
        },
        operationType: "generate_summary",
        rationale:
          "Draft summary for human review. No planning records are changed.",
        targetId: stage.id,
        targetType: "build_stage",
      },
    ],
    projectId: project.id,
    proposalType: "stage_summary",
    rationale:
      "AI generated a stage summary from current demand, allocation, matrix, and warning records for human review.",
    sourceContext: context,
    summary: response.text,
    title: `${stage.name} planning summary`,
  });
}

function buildStageSummaryContext(input: {
  planningRecords: Awaited<ReturnType<typeof listPlanningRecordsForProject>>;
  project: Awaited<ReturnType<typeof getProjectForCurrentUser>>;
  stage: Awaited<ReturnType<typeof listBuildStagesForProject>>[number];
}) {
  const stageDemands = input.planningRecords.demands.filter(
    (demand) => demand.buildStageId === input.stage.id,
  );
  const stageProfiles = input.planningRecords.profiles.filter(
    (profile) => profile.buildStageId === input.stage.id,
  );
  const stageProfileIds = new Set(stageProfiles.map((profile) => profile.id));
  const stageAllocations = input.planningRecords.allocations.filter(
    (allocation) => allocation.buildStageId === input.stage.id,
  );
  const stageMatrixEntries = input.planningRecords.matrixEntries.filter(
    (entry) => entry.buildStageId === input.stage.id,
  );

  return {
    allocations: stageAllocations.map((allocation) => ({
      allocatedQty: allocation.allocatedQty,
      configProfileId: allocation.configProfileId,
      id: allocation.id,
      rationale: allocation.rationale,
      status: allocation.status,
    })),
    demands: stageDemands.map((demand) => ({
      id: demand.id,
      priority: demand.priority,
      purpose: demand.purpose,
      requestedQty: demand.requestedQty,
      team: demand.team,
    })),
    matrixEntries: stageMatrixEntries.map((entry) => ({
      buildProcessRoute: entry.buildProcessRoute,
      id: entry.id,
      keyMaterialVariant: entry.keyMaterialVariant,
      readinessStatus: entry.readinessStatus,
    })),
    planningWarnings: input.planningRecords.planningWarnings,
    profiles: stageProfiles.map((profile) => ({
      id: profile.id,
      marketOrRegion: profile.marketOrRegion,
      materialVariant: profile.materialVariant,
      processVariant: profile.processVariant,
      productRevision: profile.productRevision,
      testPurpose: profile.testPurpose,
      variant: profile.variant,
    })),
    project: {
      description: input.project.description,
      id: input.project.id,
      name: input.project.name,
      status: input.project.status,
    },
    stage: {
      description: input.stage.description,
      goal: input.stage.goal,
      id: input.stage.id,
      name: input.stage.name,
      status: input.stage.status,
    },
    stageMappings: input.planningRecords.mappings
      .filter((mapping) => stageProfileIds.has(mapping.configProfileId))
      .map((mapping) => ({
        configProfileId: mapping.configProfileId,
        contributionQty: mapping.contributionQty,
        functionalTeamDemandId: mapping.functionalTeamDemandId,
        rationale: mapping.rationale,
      })),
  };
}
