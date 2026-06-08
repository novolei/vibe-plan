import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
}));

export const buildStagesRelations = relations(buildStages, ({ one }) => ({
  project: one(projects, {
    fields: [buildStages.projectId],
    references: [projects.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type BuildStage = typeof buildStages.$inferSelect;
export type NewBuildStage = typeof buildStages.$inferInsert;

