import { z } from "zod";

export const nonNegativeIntegerSchema = z.number().int().min(0);

const formIntegerSchema = z.coerce.number().int().min(0);
const optionalFormDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.date().optional(),
);
const readinessTargetKeySchema = z
  .string()
  .regex(
    /^(project|build_stage|build_matrix_entry):.+/,
    "Readiness target is required",
  );
const scheduleLinkedObjectKeySchema = z
  .string()
  .regex(
    /^(project|build_stage|config_profile|build_qty_allocation|build_matrix_entry|readiness_signal|blocker):.+/,
    "Schedule linked object is required",
  );

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

export const readinessSignalCreateSchema = z.object({
  projectId: z.string().uuid(),
  targetKey: readinessTargetKeySchema,
  status: z.enum(["greenlight", "at_risk", "blocked"]),
  summary: z.string().trim().min(1, "Summary is required"),
  ownerTeam: z.string().trim().optional(),
  rationale: z.string().trim().optional(),
});

export const blockerCreateSchema = z.object({
  projectId: z.string().uuid(),
  targetKey: readinessTargetKeySchema,
  readinessSignalId: z
    .union([z.string().uuid(), z.literal("").transform(() => undefined)])
    .optional(),
  title: z.string().trim().min(1, "Blocker title is required"),
  status: z.enum(["open", "mitigating", "resolved", "accepted_risk"]),
  severity: z.string().trim().min(1, "Severity is required"),
  ownerTeam: z.string().trim().min(1, "Owner team is required"),
  impact: z.string().trim().min(1, "Impact is required"),
  dueDate: optionalFormDateSchema,
  mitigation: z.string().trim().optional(),
  decisionNeeded: z.boolean().optional(),
});

export const scheduleTaskCreateSchema = z.object({
  projectId: z.string().uuid(),
  buildStageId: z.string().uuid(),
  linkedObjectKey: scheduleLinkedObjectKeySchema,
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().trim().optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked", "canceled"]),
  priority: z.string().trim().min(1, "Priority is required"),
  plannedStartDate: z.coerce.date(),
  plannedEndDate: z.coerce.date(),
});

export const scheduleDependencyCreateSchema = z.object({
  projectId: z.string().uuid(),
  predecessorTaskId: z.string().uuid(),
  successorTaskId: z.string().uuid(),
  dependencyType: z.enum([
    "finish_to_start",
    "start_to_start",
    "finish_to_finish",
    "start_to_finish",
  ]),
  lagDays: z.coerce.number().int(),
  notes: z.string().trim().optional(),
});
