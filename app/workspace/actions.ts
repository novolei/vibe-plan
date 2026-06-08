"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createBuildStage,
  createProject,
} from "@/lib/domain/projects";
import {
  buildStageCreateSchema,
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

