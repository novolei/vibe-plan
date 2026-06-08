"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function createProjectAction(formData: FormData) {
  const parsed = projectInitSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  const project = await createProject(parsed);

  revalidatePath("/workspace");
  redirect(`/workspace/projects/${project.id}`);
}

export async function createBuildStageAction(formData: FormData) {
  const parsed = buildStageCreateSchema.parse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    goal: formData.get("goal"),
    description: formData.get("description"),
    templateSource: formData.get("templateSource") || undefined,
  });

  await createBuildStage(parsed);

  revalidatePath(`/workspace/projects/${parsed.projectId}`);
}

export async function createFunctionalTeamDemandAction(formData: FormData) {
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
}

export async function createConfigProfileAction(formData: FormData) {
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
}

export async function createDemandProfileMappingAction(formData: FormData) {
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
}

export async function upsertBuildQtyAllocationAction(formData: FormData) {
  const parsed = buildQtyAllocationCreateSchema.parse({
    projectId: formData.get("projectId"),
    configProfileId: formData.get("configProfileId"),
    allocatedQty: formData.get("allocatedQty"),
    rationale: formData.get("rationale") || undefined,
  });

  await upsertBuildQtyAllocation(parsed);

  revalidatePath(`/workspace/projects/${parsed.projectId}`);
}
