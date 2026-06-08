import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projectStatus = pgEnum("project_status", [
  "draft",
  "active",
  "baselined",
  "archived",
]);

export const buildStageStatus = pgEnum("build_stage_status", [
  "draft",
  "active",
  "baselined",
  "archived",
]);

export const allocationStatus = pgEnum("allocation_status", [
  "active",
  "on_hold",
  "superseded",
]);

export const matrixReadinessStatus = pgEnum("matrix_readiness_status", [
  "greenlight",
  "at_risk",
  "blocked",
]);

export const readinessStatus = pgEnum("readiness_status", [
  "greenlight",
  "at_risk",
  "blocked",
]);

export const blockerStatus = pgEnum("blocker_status", [
  "open",
  "mitigating",
  "resolved",
  "accepted_risk",
]);

export const scheduleTaskStatus = pgEnum("schedule_task_status", [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "canceled",
]);

export const scheduleDependencyType = pgEnum("schedule_dependency_type", [
  "finish_to_start",
  "start_to_start",
  "finish_to_finish",
  "start_to_finish",
]);

export const aiRunStatus = pgEnum("ai_run_status", [
  "running",
  "succeeded",
  "failed",
]);

export const aiProposalStatus = pgEnum("ai_proposal_status", [
  "pending",
  "accepted",
  "rejected",
  "revised",
  "applied",
  "partially_applied",
  "failed",
]);

export const aiHumanDisposition = pgEnum("ai_human_disposition", [
  "pending",
  "accepted",
  "rejected",
  "revised",
]);

export const aiOperationStatus = pgEnum("ai_operation_status", [
  "pending",
  "validated",
  "rejected",
  "revised",
  "applied",
  "failed",
  "skipped",
]);

export const aiAuditEventType = pgEnum("ai_audit_event_type", [
  "run_started",
  "run_succeeded",
  "run_failed",
  "proposal_created",
  "proposal_reviewed",
  "operation_validated",
  "operation_applied",
  "operation_failed",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    ownerUserId: text("owner_user_id").notNull(),
    status: projectStatus("status").notNull().default("draft"),
    context: jsonb("context")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("projects_owner_user_id_idx").on(table.ownerUserId),
    index("projects_status_idx").on(table.status),
  ],
);

export const buildStages = pgTable(
  "build_stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    description: text("description").notNull(),
    stageOrder: integer("stage_order").notNull(),
    templateSource: text("template_source"),
    overrideData: jsonb("override_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: buildStageStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("build_stages_project_id_idx").on(table.projectId),
    index("build_stages_project_order_idx").on(
      table.projectId,
      table.stageOrder,
    ),
    index("build_stages_status_idx").on(table.status),
  ],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  buildStages: many(buildStages),
  demands: many(functionalTeamDemands),
  configProfiles: many(configProfiles),
  buildQtyAllocations: many(buildQtyAllocations),
  buildMatrixEntries: many(buildMatrixEntries),
  allocationChangeLogs: many(allocationChangeLogs),
  readinessSignals: many(readinessSignals),
  readinessRollups: many(readinessRollups),
  blockers: many(blockers),
  readinessAuditLogs: many(readinessAuditLogs),
  scheduleTasks: many(scheduleTasks),
  scheduleTaskLinks: many(scheduleTaskLinks),
  scheduleDependencies: many(scheduleDependencies),
  scheduleWorklogs: many(scheduleWorklogs),
  scheduleAuditLogs: many(scheduleAuditLogs),
  aiRuns: many(aiRuns),
  aiProposals: many(aiProposals),
  aiAuditEvents: many(aiAuditEvents),
}));

export const buildStagesRelations = relations(buildStages, ({ many, one }) => ({
  project: one(projects, {
    fields: [buildStages.projectId],
    references: [projects.id],
  }),
  demands: many(functionalTeamDemands),
  configProfiles: many(configProfiles),
  buildQtyAllocations: many(buildQtyAllocations),
  buildMatrixEntries: many(buildMatrixEntries),
  allocationChangeLogs: many(allocationChangeLogs),
  readinessSignals: many(readinessSignals),
  readinessRollups: many(readinessRollups),
  blockers: many(blockers),
  readinessAuditLogs: many(readinessAuditLogs),
  scheduleTasks: many(scheduleTasks),
  scheduleAuditLogs: many(scheduleAuditLogs),
  aiRuns: many(aiRuns),
  aiProposals: many(aiProposals),
  aiAuditEvents: many(aiAuditEvents),
}));

export const functionalTeamDemands = pgTable(
  "functional_team_demands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id")
      .notNull()
      .references(() => buildStages.id, { onDelete: "cascade" }),
    team: text("team").notNull(),
    purpose: text("purpose").notNull(),
    requestedQty: integer("requested_qty").notNull(),
    priority: text("priority").notNull(),
    ownerUserId: text("owner_user_id").notNull(),
    notes: text("notes").notNull().default(""),
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    aiSource: jsonb("ai_source").$type<Record<string, unknown>>(),
    proposalRef: text("proposal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("functional_team_demands_project_id_idx").on(table.projectId),
    index("functional_team_demands_build_stage_id_idx").on(table.buildStageId),
    index("functional_team_demands_team_idx").on(table.team),
    check(
      "functional_team_demands_requested_qty_nonnegative",
      sql`${table.requestedQty} >= 0`,
    ),
  ],
);

export const configProfiles = pgTable(
  "config_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id")
      .notNull()
      .references(() => buildStages.id, { onDelete: "cascade" }),
    productRevision: text("product_revision").notNull(),
    testPurpose: text("test_purpose").notNull(),
    marketOrRegion: text("market_or_region").notNull(),
    variant: text("variant").notNull(),
    processVariant: text("process_variant").notNull(),
    materialVariant: text("material_variant").notNull(),
    extraAttributes: jsonb("extra_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    aiSource: jsonb("ai_source").$type<Record<string, unknown>>(),
    proposalRef: text("proposal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("config_profiles_project_id_idx").on(table.projectId),
    index("config_profiles_build_stage_id_idx").on(table.buildStageId),
    uniqueIndex("config_profiles_stage_structural_key_uidx")
      .on(
        table.buildStageId,
        table.productRevision,
        table.testPurpose,
        table.marketOrRegion,
        table.variant,
        table.processVariant,
        table.materialVariant,
      )
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const demandProfileMappings = pgTable(
  "demand_profile_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    functionalTeamDemandId: uuid("functional_team_demand_id")
      .notNull()
      .references(() => functionalTeamDemands.id, { onDelete: "cascade" }),
    configProfileId: uuid("config_profile_id")
      .notNull()
      .references(() => configProfiles.id, { onDelete: "cascade" }),
    contributionQty: integer("contribution_qty").notNull(),
    weight: integer("weight"),
    rationale: text("rationale").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("demand_profile_mappings_demand_id_idx").on(
      table.functionalTeamDemandId,
    ),
    index("demand_profile_mappings_profile_id_idx").on(table.configProfileId),
    uniqueIndex("demand_profile_mappings_demand_profile_uidx")
      .on(table.functionalTeamDemandId, table.configProfileId)
      .where(sql`${table.deletedAt} is null`),
    check(
      "demand_profile_mappings_contribution_qty_nonnegative",
      sql`${table.contributionQty} >= 0`,
    ),
    check(
      "demand_profile_mappings_weight_nonnegative",
      sql`${table.weight} is null or ${table.weight} >= 0`,
    ),
  ],
);

export const buildQtyAllocations = pgTable(
  "build_qty_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id")
      .notNull()
      .references(() => buildStages.id, { onDelete: "cascade" }),
    configProfileId: uuid("config_profile_id")
      .notNull()
      .references(() => configProfiles.id, { onDelete: "cascade" }),
    allocatedQty: integer("allocated_qty").notNull(),
    rationale: text("rationale").notNull().default(""),
    status: allocationStatus("status").notNull().default("active"),
    aiSource: jsonb("ai_source").$type<Record<string, unknown>>(),
    proposalRef: text("proposal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("build_qty_allocations_project_id_idx").on(table.projectId),
    index("build_qty_allocations_build_stage_id_idx").on(table.buildStageId),
    index("build_qty_allocations_config_profile_id_idx").on(
      table.configProfileId,
    ),
    uniqueIndex("build_qty_allocations_active_profile_uidx")
      .on(table.configProfileId)
      .where(sql`${table.deletedAt} is null and ${table.status} = 'active'`),
    check(
      "build_qty_allocations_allocated_qty_nonnegative",
      sql`${table.allocatedQty} >= 0`,
    ),
  ],
);

export const allocationChangeLogs = pgTable(
  "allocation_change_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id")
      .notNull()
      .references(() => buildStages.id, { onDelete: "cascade" }),
    buildQtyAllocationId: uuid("build_qty_allocation_id")
      .notNull()
      .references(() => buildQtyAllocations.id, { onDelete: "cascade" }),
    configProfileId: uuid("config_profile_id")
      .notNull()
      .references(() => configProfiles.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").notNull(),
    fieldName: text("field_name").notNull(),
    beforeValue: jsonb("before_value").$type<unknown>(),
    afterValue: jsonb("after_value").$type<unknown>(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("allocation_change_logs_project_id_idx").on(table.projectId),
    index("allocation_change_logs_build_stage_id_idx").on(table.buildStageId),
    index("allocation_change_logs_allocation_id_idx").on(
      table.buildQtyAllocationId,
    ),
    index("allocation_change_logs_config_profile_id_idx").on(
      table.configProfileId,
    ),
    index("allocation_change_logs_created_at_idx").on(table.createdAt),
  ],
);

export const buildMatrixEntries = pgTable(
  "build_matrix_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id")
      .notNull()
      .references(() => buildStages.id, { onDelete: "cascade" }),
    configProfileId: uuid("config_profile_id")
      .notNull()
      .references(() => configProfiles.id, { onDelete: "cascade" }),
    buildQtyAllocationId: uuid("build_qty_allocation_id")
      .notNull()
      .references(() => buildQtyAllocations.id, { onDelete: "cascade" }),
    buildProcessRoute: text("build_process_route").notNull(),
    keyMaterialVariant: text("key_material_variant").notNull(),
    processOwnerTeam: text("process_owner_team").notNull().default(""),
    materialOwnerTeam: text("material_owner_team").notNull().default(""),
    readinessStatus: matrixReadinessStatus("readiness_status")
      .notNull()
      .default("at_risk"),
    notes: text("notes").notNull().default(""),
    aiSource: jsonb("ai_source").$type<Record<string, unknown>>(),
    proposalRef: text("proposal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("build_matrix_entries_project_id_idx").on(table.projectId),
    index("build_matrix_entries_build_stage_id_idx").on(table.buildStageId),
    index("build_matrix_entries_config_profile_id_idx").on(
      table.configProfileId,
    ),
    index("build_matrix_entries_allocation_id_idx").on(
      table.buildQtyAllocationId,
    ),
    uniqueIndex("build_matrix_entries_active_allocation_uidx")
      .on(table.buildQtyAllocationId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const readinessSignals = pgTable(
  "readiness_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id").references(() => buildStages.id, {
      onDelete: "set null",
    }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    status: readinessStatus("status").notNull().default("at_risk"),
    ownerTeam: text("owner_team").notNull().default(""),
    ownerUserId: text("owner_user_id").notNull().default(""),
    summary: text("summary").notNull().default(""),
    rationale: text("rationale").notNull().default(""),
    source: text("source").notNull().default("manual"),
    manualOverride: boolean("manual_override").notNull().default(false),
    overrideReason: text("override_reason").notNull().default(""),
    aiSource: jsonb("ai_source").$type<Record<string, unknown>>(),
    proposalRef: text("proposal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("readiness_signals_project_id_idx").on(table.projectId),
    index("readiness_signals_build_stage_id_idx").on(table.buildStageId),
    index("readiness_signals_target_idx").on(table.targetType, table.targetId),
    index("readiness_signals_status_idx").on(table.status),
    uniqueIndex("readiness_signals_active_target_uidx")
      .on(table.projectId, table.targetType, table.targetId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const readinessRollups = pgTable(
  "readiness_rollups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id").references(() => buildStages.id, {
      onDelete: "set null",
    }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    status: readinessStatus("status").notNull().default("greenlight"),
    sourceSignalCount: integer("source_signal_count").notNull().default(0),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("readiness_rollups_project_id_idx").on(table.projectId),
    index("readiness_rollups_build_stage_id_idx").on(table.buildStageId),
    index("readiness_rollups_target_idx").on(table.targetType, table.targetId),
    uniqueIndex("readiness_rollups_target_uidx").on(
      table.projectId,
      table.targetType,
      table.targetId,
    ),
    check(
      "readiness_rollups_source_signal_count_nonnegative",
      sql`${table.sourceSignalCount} >= 0`,
    ),
  ],
);

export const blockers = pgTable(
  "blockers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id").references(() => buildStages.id, {
      onDelete: "set null",
    }),
    readinessSignalId: uuid("readiness_signal_id").references(
      () => readinessSignals.id,
      { onDelete: "set null" },
    ),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    title: text("title").notNull(),
    status: blockerStatus("status").notNull().default("open"),
    severity: text("severity").notNull(),
    ownerTeam: text("owner_team").notNull(),
    ownerUserId: text("owner_user_id").notNull().default(""),
    impact: text("impact").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    mitigation: text("mitigation").notNull().default(""),
    decisionNeeded: boolean("decision_needed").notNull().default(false),
    aiSource: jsonb("ai_source").$type<Record<string, unknown>>(),
    proposalRef: text("proposal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("blockers_project_id_idx").on(table.projectId),
    index("blockers_build_stage_id_idx").on(table.buildStageId),
    index("blockers_readiness_signal_id_idx").on(table.readinessSignalId),
    index("blockers_target_idx").on(table.targetType, table.targetId),
    index("blockers_status_idx").on(table.status),
    index("blockers_due_date_idx").on(table.dueDate),
  ],
);

export const readinessSignoffs = pgTable(
  "readiness_signoffs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    readinessSignalId: uuid("readiness_signal_id")
      .notNull()
      .references(() => readinessSignals.id, { onDelete: "cascade" }),
    signerUserId: text("signer_user_id").notNull(),
    disposition: text("disposition").notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("readiness_signoffs_project_id_idx").on(table.projectId),
    index("readiness_signoffs_signal_id_idx").on(table.readinessSignalId),
    index("readiness_signoffs_signer_idx").on(table.signerUserId),
  ],
);

export const readinessAuditLogs = pgTable(
  "readiness_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id").references(() => buildStages.id, {
      onDelete: "set null",
    }),
    readinessSignalId: uuid("readiness_signal_id").references(
      () => readinessSignals.id,
      { onDelete: "set null" },
    ),
    readinessRollupId: uuid("readiness_rollup_id").references(
      () => readinessRollups.id,
      { onDelete: "set null" },
    ),
    blockerId: uuid("blocker_id").references(() => blockers.id, {
      onDelete: "set null",
    }),
    readinessSignoffId: uuid("readiness_signoff_id").references(
      () => readinessSignoffs.id,
      { onDelete: "set null" },
    ),
    actorUserId: text("actor_user_id").notNull(),
    eventType: text("event_type").notNull(),
    fieldName: text("field_name").notNull().default(""),
    beforeValue: jsonb("before_value").$type<unknown>(),
    afterValue: jsonb("after_value").$type<unknown>(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("readiness_audit_logs_project_id_idx").on(table.projectId),
    index("readiness_audit_logs_build_stage_id_idx").on(table.buildStageId),
    index("readiness_audit_logs_signal_id_idx").on(table.readinessSignalId),
    index("readiness_audit_logs_rollup_id_idx").on(table.readinessRollupId),
    index("readiness_audit_logs_blocker_id_idx").on(table.blockerId),
    index("readiness_audit_logs_signoff_id_idx").on(table.readinessSignoffId),
    index("readiness_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const scheduleTasks = pgTable(
  "schedule_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id")
      .notNull()
      .references(() => buildStages.id, { onDelete: "cascade" }),
    parentTaskId: uuid("parent_task_id"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    taskType: text("task_type").notNull().default("build_plan"),
    status: scheduleTaskStatus("status").notNull().default("todo"),
    priority: text("priority").notNull().default("normal"),
    ownerUserId: text("owner_user_id").notNull(),
    assigneeUserId: text("assignee_user_id").notNull().default(""),
    plannedStartDate: timestamp("planned_start_date", {
      withTimezone: true,
    }).notNull(),
    plannedEndDate: timestamp("planned_end_date", {
      withTimezone: true,
    }).notNull(),
    actualStartDate: timestamp("actual_start_date", { withTimezone: true }),
    actualEndDate: timestamp("actual_end_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationDays: integer("duration_days").notNull().default(0),
    progressPercent: integer("progress_percent").notNull().default(0),
    notes: text("notes").notNull().default(""),
    aiSource: jsonb("ai_source").$type<Record<string, unknown>>(),
    proposalRef: text("proposal_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("schedule_tasks_project_id_idx").on(table.projectId),
    index("schedule_tasks_build_stage_id_idx").on(table.buildStageId),
    index("schedule_tasks_parent_task_id_idx").on(table.parentTaskId),
    index("schedule_tasks_status_idx").on(table.status),
    index("schedule_tasks_planned_dates_idx").on(
      table.plannedStartDate,
      table.plannedEndDate,
    ),
    check(
      "schedule_tasks_duration_days_nonnegative",
      sql`${table.durationDays} >= 0`,
    ),
    check(
      "schedule_tasks_progress_percent_range",
      sql`${table.progressPercent} >= 0 and ${table.progressPercent} <= 100`,
    ),
    check(
      "schedule_tasks_planned_date_order",
      sql`${table.plannedEndDate} >= ${table.plannedStartDate}`,
    ),
  ],
);

export const scheduleTaskLinks = pgTable(
  "schedule_task_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scheduleTaskId: uuid("schedule_task_id")
      .notNull()
      .references(() => scheduleTasks.id, { onDelete: "cascade" }),
    linkedObjectType: text("linked_object_type").notNull(),
    linkedObjectId: text("linked_object_id").notNull(),
    linkRole: text("link_role").notNull().default("primary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("schedule_task_links_project_id_idx").on(table.projectId),
    index("schedule_task_links_task_id_idx").on(table.scheduleTaskId),
    index("schedule_task_links_object_idx").on(
      table.linkedObjectType,
      table.linkedObjectId,
    ),
    uniqueIndex("schedule_task_links_active_task_object_uidx")
      .on(table.scheduleTaskId, table.linkedObjectType, table.linkedObjectId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const scheduleDependencies = pgTable(
  "schedule_dependencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    predecessorTaskId: uuid("predecessor_task_id")
      .notNull()
      .references(() => scheduleTasks.id, { onDelete: "cascade" }),
    successorTaskId: uuid("successor_task_id")
      .notNull()
      .references(() => scheduleTasks.id, { onDelete: "cascade" }),
    dependencyType: scheduleDependencyType("dependency_type")
      .notNull()
      .default("finish_to_start"),
    lagDays: integer("lag_days").notNull().default(0),
    createdByUserId: text("created_by_user_id").notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("schedule_dependencies_project_id_idx").on(table.projectId),
    index("schedule_dependencies_predecessor_idx").on(table.predecessorTaskId),
    index("schedule_dependencies_successor_idx").on(table.successorTaskId),
    uniqueIndex("schedule_dependencies_active_pair_uidx")
      .on(table.predecessorTaskId, table.successorTaskId, table.dependencyType)
      .where(sql`${table.deletedAt} is null`),
    check(
      "schedule_dependencies_no_self_dependency",
      sql`${table.predecessorTaskId} <> ${table.successorTaskId}`,
    ),
  ],
);

export const scheduleWorklogs = pgTable(
  "schedule_worklogs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scheduleTaskId: uuid("schedule_task_id")
      .notNull()
      .references(() => scheduleTasks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    workDate: timestamp("work_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    summary: text("summary").notNull().default(""),
    blockerNote: text("blocker_note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("schedule_worklogs_project_id_idx").on(table.projectId),
    index("schedule_worklogs_task_id_idx").on(table.scheduleTaskId),
    index("schedule_worklogs_work_date_idx").on(table.workDate),
    check(
      "schedule_worklogs_duration_minutes_nonnegative",
      sql`${table.durationMinutes} >= 0`,
    ),
  ],
);

export const scheduleAuditLogs = pgTable(
  "schedule_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id").references(() => buildStages.id, {
      onDelete: "set null",
    }),
    scheduleTaskId: uuid("schedule_task_id").references(
      () => scheduleTasks.id,
      { onDelete: "set null" },
    ),
    scheduleDependencyId: uuid("schedule_dependency_id").references(
      () => scheduleDependencies.id,
      { onDelete: "set null" },
    ),
    scheduleWorklogId: uuid("schedule_worklog_id").references(
      () => scheduleWorklogs.id,
      { onDelete: "set null" },
    ),
    actorUserId: text("actor_user_id").notNull(),
    changedField: text("changed_field").notNull().default(""),
    beforeValue: jsonb("before_value").$type<unknown>(),
    afterValue: jsonb("after_value").$type<unknown>(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("schedule_audit_logs_project_id_idx").on(table.projectId),
    index("schedule_audit_logs_build_stage_id_idx").on(table.buildStageId),
    index("schedule_audit_logs_task_id_idx").on(table.scheduleTaskId),
    index("schedule_audit_logs_dependency_id_idx").on(
      table.scheduleDependencyId,
    ),
    index("schedule_audit_logs_worklog_id_idx").on(table.scheduleWorklogId),
    index("schedule_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const aiAgents = pgTable(
  "ai_agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("ai_agents_provider_model_idx").on(table.provider, table.model),
    index("ai_agents_status_idx").on(table.status),
  ],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id").references(() => buildStages.id, {
      onDelete: "set null",
    }),
    aiAgentId: uuid("ai_agent_id").references(() => aiAgents.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: aiRunStatus("status").notNull().default("running"),
    inputRefs: jsonb("input_refs")
      .$type<Array<Record<string, string>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    contextSummary: text("context_summary").notNull().default(""),
    outputSummary: text("output_summary").notNull().default(""),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_runs_project_id_idx").on(table.projectId),
    index("ai_runs_build_stage_id_idx").on(table.buildStageId),
    index("ai_runs_agent_id_idx").on(table.aiAgentId),
    index("ai_runs_status_idx").on(table.status),
  ],
);

export const aiProposals = pgTable(
  "ai_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id").references(() => buildStages.id, {
      onDelete: "set null",
    }),
    aiRunId: uuid("ai_run_id").references(() => aiRuns.id, {
      onDelete: "set null",
    }),
    proposalType: text("proposal_type").notNull(),
    status: aiProposalStatus("status").notNull().default("pending"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    sourceContext: jsonb("source_context")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    rationale: text("rationale").notNull().default(""),
    confidence: integer("confidence"),
    humanDisposition: aiHumanDisposition("human_disposition")
      .notNull()
      .default("pending"),
    reviewerUserId: text("reviewer_user_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_proposals_project_id_idx").on(table.projectId),
    index("ai_proposals_build_stage_id_idx").on(table.buildStageId),
    index("ai_proposals_run_id_idx").on(table.aiRunId),
    index("ai_proposals_status_idx").on(table.status),
    index("ai_proposals_disposition_idx").on(table.humanDisposition),
    check(
      "ai_proposals_confidence_range",
      sql`${table.confidence} is null or (${table.confidence} >= 0 and ${table.confidence} <= 100)`,
    ),
  ],
);

export const aiOperations = pgTable(
  "ai_operations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    aiProposalId: uuid("ai_proposal_id")
      .notNull()
      .references(() => aiProposals.id, { onDelete: "cascade" }),
    operationType: text("operation_type").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    inputPayload: jsonb("input_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    rationale: text("rationale").notNull().default(""),
    confidence: integer("confidence"),
    validationStatus: aiOperationStatus("validation_status")
      .notNull()
      .default("pending"),
    executionStatus: aiOperationStatus("execution_status")
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_operations_proposal_id_idx").on(table.aiProposalId),
    index("ai_operations_type_idx").on(table.operationType),
    index("ai_operations_target_idx").on(table.targetType, table.targetId),
    index("ai_operations_validation_status_idx").on(table.validationStatus),
    index("ai_operations_execution_status_idx").on(table.executionStatus),
    check(
      "ai_operations_confidence_range",
      sql`${table.confidence} is null or (${table.confidence} >= 0 and ${table.confidence} <= 100)`,
    ),
  ],
);

export const aiAuditEvents = pgTable(
  "ai_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    buildStageId: uuid("build_stage_id").references(() => buildStages.id, {
      onDelete: "set null",
    }),
    aiAgentId: uuid("ai_agent_id").references(() => aiAgents.id, {
      onDelete: "set null",
    }),
    aiRunId: uuid("ai_run_id").references(() => aiRuns.id, {
      onDelete: "set null",
    }),
    aiProposalId: uuid("ai_proposal_id").references(() => aiProposals.id, {
      onDelete: "set null",
    }),
    aiOperationId: uuid("ai_operation_id").references(() => aiOperations.id, {
      onDelete: "set null",
    }),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    eventType: aiAuditEventType("event_type").notNull(),
    eventPayload: jsonb("event_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ai_audit_events_project_id_idx").on(table.projectId),
    index("ai_audit_events_build_stage_id_idx").on(table.buildStageId),
    index("ai_audit_events_agent_id_idx").on(table.aiAgentId),
    index("ai_audit_events_run_id_idx").on(table.aiRunId),
    index("ai_audit_events_proposal_id_idx").on(table.aiProposalId),
    index("ai_audit_events_operation_id_idx").on(table.aiOperationId),
    index("ai_audit_events_event_type_idx").on(table.eventType),
    index("ai_audit_events_created_at_idx").on(table.createdAt),
  ],
);

export const functionalTeamDemandsRelations = relations(
  functionalTeamDemands,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [functionalTeamDemands.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [functionalTeamDemands.buildStageId],
      references: [buildStages.id],
    }),
    mappings: many(demandProfileMappings),
  }),
);

export const configProfilesRelations = relations(
  configProfiles,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [configProfiles.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [configProfiles.buildStageId],
      references: [buildStages.id],
    }),
    mappings: many(demandProfileMappings),
    allocations: many(buildQtyAllocations),
    buildMatrixEntries: many(buildMatrixEntries),
    allocationChangeLogs: many(allocationChangeLogs),
  }),
);

export const demandProfileMappingsRelations = relations(
  demandProfileMappings,
  ({ one }) => ({
    demand: one(functionalTeamDemands, {
      fields: [demandProfileMappings.functionalTeamDemandId],
      references: [functionalTeamDemands.id],
    }),
    configProfile: one(configProfiles, {
      fields: [demandProfileMappings.configProfileId],
      references: [configProfiles.id],
    }),
  }),
);

export const buildQtyAllocationsRelations = relations(
  buildQtyAllocations,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [buildQtyAllocations.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [buildQtyAllocations.buildStageId],
      references: [buildStages.id],
    }),
    configProfile: one(configProfiles, {
      fields: [buildQtyAllocations.configProfileId],
      references: [configProfiles.id],
    }),
    buildMatrixEntries: many(buildMatrixEntries),
    changeLogs: many(allocationChangeLogs),
  }),
);

export const buildMatrixEntriesRelations = relations(
  buildMatrixEntries,
  ({ one }) => ({
    project: one(projects, {
      fields: [buildMatrixEntries.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [buildMatrixEntries.buildStageId],
      references: [buildStages.id],
    }),
    configProfile: one(configProfiles, {
      fields: [buildMatrixEntries.configProfileId],
      references: [configProfiles.id],
    }),
    buildQtyAllocation: one(buildQtyAllocations, {
      fields: [buildMatrixEntries.buildQtyAllocationId],
      references: [buildQtyAllocations.id],
    }),
  }),
);

export const readinessSignalsRelations = relations(
  readinessSignals,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [readinessSignals.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [readinessSignals.buildStageId],
      references: [buildStages.id],
    }),
    blockers: many(blockers),
    signoffs: many(readinessSignoffs),
    auditLogs: many(readinessAuditLogs),
  }),
);

export const readinessRollupsRelations = relations(
  readinessRollups,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [readinessRollups.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [readinessRollups.buildStageId],
      references: [buildStages.id],
    }),
    auditLogs: many(readinessAuditLogs),
  }),
);

export const blockersRelations = relations(blockers, ({ many, one }) => ({
  project: one(projects, {
    fields: [blockers.projectId],
    references: [projects.id],
  }),
  buildStage: one(buildStages, {
    fields: [blockers.buildStageId],
    references: [buildStages.id],
  }),
  readinessSignal: one(readinessSignals, {
    fields: [blockers.readinessSignalId],
    references: [readinessSignals.id],
  }),
  auditLogs: many(readinessAuditLogs),
}));

export const readinessSignoffsRelations = relations(
  readinessSignoffs,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [readinessSignoffs.projectId],
      references: [projects.id],
    }),
    readinessSignal: one(readinessSignals, {
      fields: [readinessSignoffs.readinessSignalId],
      references: [readinessSignals.id],
    }),
    auditLogs: many(readinessAuditLogs),
  }),
);

export const readinessAuditLogsRelations = relations(
  readinessAuditLogs,
  ({ one }) => ({
    project: one(projects, {
      fields: [readinessAuditLogs.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [readinessAuditLogs.buildStageId],
      references: [buildStages.id],
    }),
    readinessSignal: one(readinessSignals, {
      fields: [readinessAuditLogs.readinessSignalId],
      references: [readinessSignals.id],
    }),
    readinessRollup: one(readinessRollups, {
      fields: [readinessAuditLogs.readinessRollupId],
      references: [readinessRollups.id],
    }),
    blocker: one(blockers, {
      fields: [readinessAuditLogs.blockerId],
      references: [blockers.id],
    }),
    readinessSignoff: one(readinessSignoffs, {
      fields: [readinessAuditLogs.readinessSignoffId],
      references: [readinessSignoffs.id],
    }),
  }),
);

export const scheduleTasksRelations = relations(
  scheduleTasks,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [scheduleTasks.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [scheduleTasks.buildStageId],
      references: [buildStages.id],
    }),
    links: many(scheduleTaskLinks),
    predecessorDependencies: many(scheduleDependencies, {
      relationName: "predecessorTask",
    }),
    successorDependencies: many(scheduleDependencies, {
      relationName: "successorTask",
    }),
    worklogs: many(scheduleWorklogs),
    auditLogs: many(scheduleAuditLogs),
  }),
);

export const scheduleTaskLinksRelations = relations(
  scheduleTaskLinks,
  ({ one }) => ({
    project: one(projects, {
      fields: [scheduleTaskLinks.projectId],
      references: [projects.id],
    }),
    scheduleTask: one(scheduleTasks, {
      fields: [scheduleTaskLinks.scheduleTaskId],
      references: [scheduleTasks.id],
    }),
  }),
);

export const scheduleDependenciesRelations = relations(
  scheduleDependencies,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [scheduleDependencies.projectId],
      references: [projects.id],
    }),
    predecessorTask: one(scheduleTasks, {
      fields: [scheduleDependencies.predecessorTaskId],
      references: [scheduleTasks.id],
      relationName: "predecessorTask",
    }),
    successorTask: one(scheduleTasks, {
      fields: [scheduleDependencies.successorTaskId],
      references: [scheduleTasks.id],
      relationName: "successorTask",
    }),
    auditLogs: many(scheduleAuditLogs),
  }),
);

export const scheduleWorklogsRelations = relations(
  scheduleWorklogs,
  ({ many, one }) => ({
    project: one(projects, {
      fields: [scheduleWorklogs.projectId],
      references: [projects.id],
    }),
    scheduleTask: one(scheduleTasks, {
      fields: [scheduleWorklogs.scheduleTaskId],
      references: [scheduleTasks.id],
    }),
    auditLogs: many(scheduleAuditLogs),
  }),
);

export const scheduleAuditLogsRelations = relations(
  scheduleAuditLogs,
  ({ one }) => ({
    project: one(projects, {
      fields: [scheduleAuditLogs.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [scheduleAuditLogs.buildStageId],
      references: [buildStages.id],
    }),
    scheduleTask: one(scheduleTasks, {
      fields: [scheduleAuditLogs.scheduleTaskId],
      references: [scheduleTasks.id],
    }),
    scheduleDependency: one(scheduleDependencies, {
      fields: [scheduleAuditLogs.scheduleDependencyId],
      references: [scheduleDependencies.id],
    }),
    scheduleWorklog: one(scheduleWorklogs, {
      fields: [scheduleAuditLogs.scheduleWorklogId],
      references: [scheduleWorklogs.id],
    }),
  }),
);

export const allocationChangeLogsRelations = relations(
  allocationChangeLogs,
  ({ one }) => ({
    project: one(projects, {
      fields: [allocationChangeLogs.projectId],
      references: [projects.id],
    }),
    buildStage: one(buildStages, {
      fields: [allocationChangeLogs.buildStageId],
      references: [buildStages.id],
    }),
    buildQtyAllocation: one(buildQtyAllocations, {
      fields: [allocationChangeLogs.buildQtyAllocationId],
      references: [buildQtyAllocations.id],
    }),
    configProfile: one(configProfiles, {
      fields: [allocationChangeLogs.configProfileId],
      references: [configProfiles.id],
    }),
  }),
);

export const aiAgentsRelations = relations(aiAgents, ({ many }) => ({
  runs: many(aiRuns),
  auditEvents: many(aiAuditEvents),
}));

export const aiRunsRelations = relations(aiRuns, ({ many, one }) => ({
  project: one(projects, {
    fields: [aiRuns.projectId],
    references: [projects.id],
  }),
  buildStage: one(buildStages, {
    fields: [aiRuns.buildStageId],
    references: [buildStages.id],
  }),
  aiAgent: one(aiAgents, {
    fields: [aiRuns.aiAgentId],
    references: [aiAgents.id],
  }),
  proposals: many(aiProposals),
  auditEvents: many(aiAuditEvents),
}));

export const aiProposalsRelations = relations(aiProposals, ({ many, one }) => ({
  project: one(projects, {
    fields: [aiProposals.projectId],
    references: [projects.id],
  }),
  buildStage: one(buildStages, {
    fields: [aiProposals.buildStageId],
    references: [buildStages.id],
  }),
  aiRun: one(aiRuns, {
    fields: [aiProposals.aiRunId],
    references: [aiRuns.id],
  }),
  operations: many(aiOperations),
  auditEvents: many(aiAuditEvents),
}));

export const aiOperationsRelations = relations(
  aiOperations,
  ({ many, one }) => ({
    aiProposal: one(aiProposals, {
      fields: [aiOperations.aiProposalId],
      references: [aiProposals.id],
    }),
    auditEvents: many(aiAuditEvents),
  }),
);

export const aiAuditEventsRelations = relations(aiAuditEvents, ({ one }) => ({
  project: one(projects, {
    fields: [aiAuditEvents.projectId],
    references: [projects.id],
  }),
  buildStage: one(buildStages, {
    fields: [aiAuditEvents.buildStageId],
    references: [buildStages.id],
  }),
  aiAgent: one(aiAgents, {
    fields: [aiAuditEvents.aiAgentId],
    references: [aiAgents.id],
  }),
  aiRun: one(aiRuns, {
    fields: [aiAuditEvents.aiRunId],
    references: [aiRuns.id],
  }),
  aiProposal: one(aiProposals, {
    fields: [aiAuditEvents.aiProposalId],
    references: [aiProposals.id],
  }),
  aiOperation: one(aiOperations, {
    fields: [aiAuditEvents.aiOperationId],
    references: [aiOperations.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type BuildStage = typeof buildStages.$inferSelect;
export type NewBuildStage = typeof buildStages.$inferInsert;
export type FunctionalTeamDemand = typeof functionalTeamDemands.$inferSelect;
export type NewFunctionalTeamDemand = typeof functionalTeamDemands.$inferInsert;
export type ConfigProfile = typeof configProfiles.$inferSelect;
export type NewConfigProfile = typeof configProfiles.$inferInsert;
export type DemandProfileMapping = typeof demandProfileMappings.$inferSelect;
export type NewDemandProfileMapping = typeof demandProfileMappings.$inferInsert;
export type BuildQtyAllocation = typeof buildQtyAllocations.$inferSelect;
export type NewBuildQtyAllocation = typeof buildQtyAllocations.$inferInsert;
export type AllocationChangeLog = typeof allocationChangeLogs.$inferSelect;
export type NewAllocationChangeLog = typeof allocationChangeLogs.$inferInsert;
export type BuildMatrixEntry = typeof buildMatrixEntries.$inferSelect;
export type NewBuildMatrixEntry = typeof buildMatrixEntries.$inferInsert;
export type ReadinessSignal = typeof readinessSignals.$inferSelect;
export type NewReadinessSignal = typeof readinessSignals.$inferInsert;
export type ReadinessRollup = typeof readinessRollups.$inferSelect;
export type NewReadinessRollup = typeof readinessRollups.$inferInsert;
export type Blocker = typeof blockers.$inferSelect;
export type NewBlocker = typeof blockers.$inferInsert;
export type ReadinessSignoff = typeof readinessSignoffs.$inferSelect;
export type NewReadinessSignoff = typeof readinessSignoffs.$inferInsert;
export type ReadinessAuditLog = typeof readinessAuditLogs.$inferSelect;
export type NewReadinessAuditLog = typeof readinessAuditLogs.$inferInsert;
export type ScheduleTask = typeof scheduleTasks.$inferSelect;
export type NewScheduleTask = typeof scheduleTasks.$inferInsert;
export type ScheduleTaskLink = typeof scheduleTaskLinks.$inferSelect;
export type NewScheduleTaskLink = typeof scheduleTaskLinks.$inferInsert;
export type ScheduleDependency = typeof scheduleDependencies.$inferSelect;
export type NewScheduleDependency = typeof scheduleDependencies.$inferInsert;
export type ScheduleWorklog = typeof scheduleWorklogs.$inferSelect;
export type NewScheduleWorklog = typeof scheduleWorklogs.$inferInsert;
export type ScheduleAuditLog = typeof scheduleAuditLogs.$inferSelect;
export type NewScheduleAuditLog = typeof scheduleAuditLogs.$inferInsert;
export type AIAgent = typeof aiAgents.$inferSelect;
export type NewAIAgent = typeof aiAgents.$inferInsert;
export type AIRun = typeof aiRuns.$inferSelect;
export type NewAIRun = typeof aiRuns.$inferInsert;
export type AIProposal = typeof aiProposals.$inferSelect;
export type NewAIProposal = typeof aiProposals.$inferInsert;
export type AIOperation = typeof aiOperations.$inferSelect;
export type NewAIOperation = typeof aiOperations.$inferInsert;
export type AIAuditEvent = typeof aiAuditEvents.$inferSelect;
export type NewAIAuditEvent = typeof aiAuditEvents.$inferInsert;
