import { relations, sql } from "drizzle-orm";
import {
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
  allocationChangeLogs: many(allocationChangeLogs),
}));

export const buildStagesRelations = relations(buildStages, ({ many, one }) => ({
  project: one(projects, {
    fields: [buildStages.projectId],
    references: [projects.id],
  }),
  demands: many(functionalTeamDemands),
  configProfiles: many(configProfiles),
  buildQtyAllocations: many(buildQtyAllocations),
  allocationChangeLogs: many(allocationChangeLogs),
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
    changeLogs: many(allocationChangeLogs),
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
