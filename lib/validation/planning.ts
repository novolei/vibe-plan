import { z } from "zod";

export const nonNegativeIntegerSchema = z.number().int().min(0);

export const projectInitSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  description: z.string().trim().min(1, "Project description is required"),
});

export const buildStageCreateSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1, "Stage name is required"),
  goal: z.string().trim().min(1, "Stage goal is required"),
  description: z.string().trim().min(1, "Stage description is required"),
  templateSource: z.string().trim().optional(),
});
