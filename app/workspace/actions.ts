"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import {
  createBuildStage,
  createConfigProfile,
  createDemandProfileMapping,
  createFunctionalTeamDemand,
  createProject,
  upsertBuildQtyAllocation,
} from "@/lib/domain/projects";
import {
  buildQtyAllocationCreateSchema,
  buildStageCreateSchema,
  configProfileCreateSchema,
  demandProfileMappingCreateSchema,
  functionalTeamDemandCreateSchema,
  projectInitSchema,
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
