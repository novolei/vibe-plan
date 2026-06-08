"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { reviewAiProposal } from "@/lib/domain/ai-proposals";
import { generateStageSummaryProposal } from "@/lib/domain/planning-copilot";
import {
  createBuildMatrixEntry,
  createBuildStage,
  createConfigProfile,
  createDemandProfileMapping,
  createFunctionalTeamDemand,
  createProject,
  upsertBuildQtyAllocation,
} from "@/lib/domain/projects";
import {
  createBlocker,
  createReadinessSignal,
  type ReadinessTargetType,
} from "@/lib/domain/readiness";
import {
  createScheduleDependency,
  createScheduleTask,
  type ScheduleLinkedObjectType,
} from "@/lib/domain/schedule";
import {
  aiProposalReviewSchema,
  aiStageSummaryProposalCreateSchema,
  blockerCreateSchema,
  buildMatrixEntryCreateSchema,
  buildQtyAllocationCreateSchema,
  buildStageCreateSchema,
  configProfileCreateSchema,
  demandProfileMappingCreateSchema,
  functionalTeamDemandCreateSchema,
  projectInitSchema,
  readinessSignalCreateSchema,
  scheduleDependencyCreateSchema,
  scheduleTaskCreateSchema,
} from "@/lib/validation/planning";

export type WorkspaceActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  message: string;
  status: "idle" | "success" | "error";
  values?: Record<string, string>;
};

export async function createProjectAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  let projectId: string;

  try {
    const parsed = projectInitSchema.parse({
      name: formData.get("name"),
      description: formData.get("description"),
    });

    const project = await createProject(parsed);
    projectId = project.id;
  } catch (error) {
    return actionErrorState(error, formData, ["name", "description"]);
  }

  revalidatePath("/workspace");
  redirect(`/workspace/projects/${projectId}`);
}

export async function createBuildStageAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = buildStageCreateSchema.parse({
      projectId: formData.get("projectId"),
      name: formData.get("name"),
      goal: formData.get("goal"),
      description: formData.get("description"),
      templateSource: formData.get("templateSource") || undefined,
    });

    await createBuildStage(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Build stage created.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "name",
      "goal",
      "description",
      "templateSource",
    ]);
  }
}

export async function createFunctionalTeamDemandAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = functionalTeamDemandCreateSchema.parse({
      projectId: formData.get("projectId"),
      buildStageId: formData.get("buildStageId"),
      team: formData.get("team"),
      purpose: formData.get("purpose"),
      requestedQty: formData.get("requestedQty"),
      priority: formData.get("priority"),
      notes: formData.get("notes") || undefined,
    });

    await createFunctionalTeamDemand(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Demand request added.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "buildStageId",
      "team",
      "purpose",
      "requestedQty",
      "priority",
      "notes",
    ]);
  }
}

export async function createConfigProfileAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = configProfileCreateSchema.parse({
      projectId: formData.get("projectId"),
      buildStageId: formData.get("buildStageId"),
      productRevision: formData.get("productRevision"),
      testPurpose: formData.get("testPurpose"),
      marketOrRegion: formData.get("marketOrRegion"),
      variant: formData.get("variant"),
      processVariant: formData.get("processVariant"),
      materialVariant: formData.get("materialVariant"),
    });

    await createConfigProfile(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Config profile added.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "buildStageId",
      "productRevision",
      "testPurpose",
      "marketOrRegion",
      "variant",
      "processVariant",
      "materialVariant",
    ]);
  }
}

export async function createDemandProfileMappingAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = demandProfileMappingCreateSchema.parse({
      projectId: formData.get("projectId"),
      functionalTeamDemandId: formData.get("functionalTeamDemandId"),
      configProfileId: formData.get("configProfileId"),
      contributionQty: formData.get("contributionQty"),
      weight: formData.get("weight") || undefined,
      rationale: formData.get("rationale") || undefined,
    });

    await createDemandProfileMapping(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Demand mapping added.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "functionalTeamDemandId",
      "configProfileId",
      "contributionQty",
      "weight",
      "rationale",
    ]);
  }
}

export async function upsertBuildQtyAllocationAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = buildQtyAllocationCreateSchema.parse({
      projectId: formData.get("projectId"),
      configProfileId: formData.get("configProfileId"),
      allocatedQty: formData.get("allocatedQty"),
      rationale: formData.get("rationale") || undefined,
    });

    await upsertBuildQtyAllocation(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Allocation saved.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "configProfileId",
      "allocatedQty",
      "rationale",
    ]);
  }
}

export async function createBuildMatrixEntryAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = buildMatrixEntryCreateSchema.parse({
      projectId: formData.get("projectId"),
      buildQtyAllocationId: formData.get("buildQtyAllocationId"),
      buildProcessRoute: formData.get("buildProcessRoute"),
      keyMaterialVariant: formData.get("keyMaterialVariant"),
      processOwnerTeam: formData.get("processOwnerTeam") || undefined,
      materialOwnerTeam: formData.get("materialOwnerTeam") || undefined,
      readinessStatus: formData.get("readinessStatus"),
      notes: formData.get("notes") || undefined,
    });

    await createBuildMatrixEntry(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Matrix entry saved.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "buildQtyAllocationId",
      "buildProcessRoute",
      "keyMaterialVariant",
      "processOwnerTeam",
      "materialOwnerTeam",
      "readinessStatus",
      "notes",
    ]);
  }
}

export async function generateStageSummaryProposalAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = aiStageSummaryProposalCreateSchema.parse({
      projectId: formData.get("projectId"),
      buildStageId: formData.get("buildStageId"),
    });

    await generateStageSummaryProposal(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("AI proposal generated.");
  } catch (error) {
    return actionErrorState(error, formData, ["projectId", "buildStageId"]);
  }
}

export async function reviewAiProposalAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = aiProposalReviewSchema.parse({
      projectId: formData.get("projectId"),
      proposalId: formData.get("proposalId"),
      disposition: formData.get("disposition"),
      reviewNotes: formData.get("reviewNotes") || undefined,
    });

    await reviewAiProposal(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("AI proposal reviewed.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "proposalId",
      "disposition",
      "reviewNotes",
    ]);
  }
}

export async function createReadinessSignalAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = readinessSignalCreateSchema.parse({
      projectId: formData.get("projectId"),
      targetKey: formData.get("targetKey"),
      status: formData.get("status"),
      summary: formData.get("summary"),
      ownerTeam: formData.get("ownerTeam") || undefined,
      rationale: formData.get("rationale") || undefined,
    });
    const target = parseReadinessTargetKey(parsed.targetKey);

    await createReadinessSignal({
      ownerTeam: parsed.ownerTeam,
      projectId: parsed.projectId,
      rationale: parsed.rationale,
      status: parsed.status,
      summary: parsed.summary,
      targetId: target.targetId,
      targetType: target.targetType,
    });

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Readiness signal saved.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "targetKey",
      "status",
      "summary",
      "ownerTeam",
      "rationale",
    ]);
  }
}

export async function createBlockerAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = blockerCreateSchema.parse({
      projectId: formData.get("projectId"),
      targetKey: formData.get("targetKey"),
      readinessSignalId: formData.get("readinessSignalId") || undefined,
      title: formData.get("title"),
      status: formData.get("status"),
      severity: formData.get("severity"),
      ownerTeam: formData.get("ownerTeam"),
      impact: formData.get("impact"),
      dueDate: formData.get("dueDate") || undefined,
      mitigation: formData.get("mitigation") || undefined,
      decisionNeeded: formData.get("decisionNeeded") === "on",
    });
    const target = parseReadinessTargetKey(parsed.targetKey);

    await createBlocker({
      decisionNeeded: parsed.decisionNeeded,
      dueDate: parsed.dueDate,
      impact: parsed.impact,
      mitigation: parsed.mitigation,
      ownerTeam: parsed.ownerTeam,
      projectId: parsed.projectId,
      readinessSignalId: parsed.readinessSignalId,
      severity: parsed.severity,
      status: parsed.status,
      targetId: target.targetId,
      targetType: target.targetType,
      title: parsed.title,
    });

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Blocker saved.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "targetKey",
      "readinessSignalId",
      "title",
      "status",
      "severity",
      "ownerTeam",
      "impact",
      "dueDate",
      "mitigation",
      "decisionNeeded",
    ]);
  }
}

export async function createScheduleTaskAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = scheduleTaskCreateSchema.parse({
      projectId: formData.get("projectId"),
      buildStageId: formData.get("buildStageId"),
      linkedObjectKey: formData.get("linkedObjectKey"),
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      status: formData.get("status"),
      priority: formData.get("priority"),
      plannedStartDate: formData.get("plannedStartDate"),
      plannedEndDate: formData.get("plannedEndDate"),
    });
    const link = parseScheduleLinkedObjectKey(parsed.linkedObjectKey);

    await createScheduleTask({
      buildStageId: parsed.buildStageId,
      description: parsed.description,
      link,
      plannedEndDate: parsed.plannedEndDate,
      plannedStartDate: parsed.plannedStartDate,
      priority: parsed.priority,
      projectId: parsed.projectId,
      status: parsed.status,
      title: parsed.title,
    });

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Schedule task saved.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "buildStageId",
      "linkedObjectKey",
      "title",
      "description",
      "status",
      "priority",
      "plannedStartDate",
      "plannedEndDate",
    ]);
  }
}

export async function createScheduleDependencyAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const parsed = scheduleDependencyCreateSchema.parse({
      projectId: formData.get("projectId"),
      predecessorTaskId: formData.get("predecessorTaskId"),
      successorTaskId: formData.get("successorTaskId"),
      dependencyType: formData.get("dependencyType"),
      lagDays: formData.get("lagDays"),
      notes: formData.get("notes") || undefined,
    });

    await createScheduleDependency(parsed);

    revalidatePath(`/workspace/projects/${parsed.projectId}`);
    return successState("Schedule dependency saved.");
  } catch (error) {
    return actionErrorState(error, formData, [
      "projectId",
      "predecessorTaskId",
      "successorTaskId",
      "dependencyType",
      "lagDays",
      "notes",
    ]);
  }
}

function actionErrorState(
  error: unknown,
  formData: FormData,
  fields: string[],
): WorkspaceActionState {
  if (error instanceof ZodError) {
    return {
      fieldErrors: error.flatten().fieldErrors,
      message: "Please fix the highlighted fields.",
      status: "error",
      values: formValues(formData, fields),
    };
  }

  return {
    message: expectedErrorMessage(error),
    status: "error",
    values: formValues(formData, fields),
  };
}

function expectedErrorMessage(error: unknown) {
  const errorText = collectErrorText(error).join(" ").toLowerCase();

  if (
    errorText.includes("23505") ||
    errorText.includes("duplicate") ||
    errorText.includes("_uidx") ||
    errorText.includes("unique")
  ) {
    return "A matching record already exists.";
  }

  if (
    errorText.includes("23514") ||
    errorText.includes("check constraint") ||
    errorText.includes("violates check")
  ) {
    return "Quantity values must be zero or greater.";
  }

  if (errorText.includes("failed query")) {
    return "The record could not be saved. Check for duplicates or invalid values.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function collectErrorText(error: unknown, seen = new Set<unknown>()): string[] {
  if (!error || seen.has(error)) {
    return [];
  }

  seen.add(error);

  if (typeof error === "string") {
    return [error];
  }

  if (!(error instanceof Error) && typeof error !== "object") {
    return [];
  }

  const record = error as {
    cause?: unknown;
    code?: unknown;
    constraint?: unknown;
    detail?: unknown;
    message?: unknown;
  };

  return [
    record.message,
    record.code,
    record.constraint,
    record.detail,
    ...collectErrorText(record.cause, seen),
  ]
    .filter((value): value is string => typeof value === "string")
    .filter(Boolean);
}

function formValues(formData: FormData, fields: string[]) {
  return Object.fromEntries(
    fields.map((field) => [field, String(formData.get(field) ?? "")]),
  );
}

function successState(message: string): WorkspaceActionState {
  return {
    message,
    status: "success",
  };
}

function parseReadinessTargetKey(value: string): {
  targetId: string;
  targetType: ReadinessTargetType;
} {
  const separatorIndex = value.indexOf(":");
  const targetType = value.slice(0, separatorIndex) as ReadinessTargetType;
  const targetId = value.slice(separatorIndex + 1);

  return { targetId, targetType };
}

function parseScheduleLinkedObjectKey(value: string): {
  linkedObjectId: string;
  linkedObjectType: ScheduleLinkedObjectType;
} {
  const separatorIndex = value.indexOf(":");
  const linkedObjectType = value.slice(
    0,
    separatorIndex,
  ) as ScheduleLinkedObjectType;
  const linkedObjectId = value.slice(separatorIndex + 1);

  return { linkedObjectId, linkedObjectType };
}
