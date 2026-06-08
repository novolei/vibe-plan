import { z } from "zod";

export const nonNegativeIntegerSchema = z.number().int().min(0);

const formIntegerSchema = z.coerce.number().int().min(0);

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

export const functionalTeamDemandCreateSchema = z.object({
  projectId: z.string().uuid(),
  buildStageId: z.string().uuid(),
  team: z.string().trim().min(1, "Team is required"),
  purpose: z.string().trim().min(1, "Purpose is required"),
  requestedQty: formIntegerSchema,
  priority: z.string().trim().min(1, "Priority is required"),
  notes: z.string().trim().optional(),
});

export const configProfileCreateSchema = z.object({
  projectId: z.string().uuid(),
  buildStageId: z.string().uuid(),
  productRevision: z.string().trim().min(1, "Product revision is required"),
  testPurpose: z.string().trim().min(1, "Test purpose is required"),
  marketOrRegion: z.string().trim().min(1, "Market or region is required"),
  variant: z.string().trim().min(1, "Variant is required"),
  processVariant: z.string().trim().min(1, "Process variant is required"),
  materialVariant: z.string().trim().min(1, "Material variant is required"),
});

export const demandProfileMappingCreateSchema = z.object({
  projectId: z.string().uuid(),
  functionalTeamDemandId: z.string().uuid(),
  configProfileId: z.string().uuid(),
  contributionQty: formIntegerSchema,
  weight: z
    .union([formIntegerSchema, z.literal("").transform(() => undefined)])
    .optional(),
  rationale: z.string().trim().optional(),
});

export const buildQtyAllocationCreateSchema = z.object({
  projectId: z.string().uuid(),
  configProfileId: z.string().uuid(),
  allocatedQty: formIntegerSchema,
  rationale: z.string().trim().optional(),
});

export const buildMatrixEntryCreateSchema = z.object({
  projectId: z.string().uuid(),
  buildQtyAllocationId: z.string().uuid(),
  buildProcessRoute: z
    .string()
    .trim()
    .min(1, "Build process route is required"),
  keyMaterialVariant: z
    .string()
    .trim()
    .min(1, "Key material variant is required"),
  processOwnerTeam: z.string().trim().optional(),
  materialOwnerTeam: z.string().trim().optional(),
  readinessStatus: z.enum(["greenlight", "at_risk", "blocked"]),
  notes: z.string().trim().optional(),
});

export const aiStageSummaryProposalCreateSchema = z.object({
  projectId: z.string().uuid(),
  buildStageId: z.string().uuid(),
});

export const aiProposalReviewSchema = z.object({
  projectId: z.string().uuid(),
  proposalId: z.string().uuid(),
  disposition: z.enum(["accepted", "rejected", "revised"]),
  reviewNotes: z.string().trim().optional(),
});
