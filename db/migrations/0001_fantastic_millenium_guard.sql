CREATE TYPE "public"."allocation_status" AS ENUM('active', 'on_hold', 'superseded');--> statement-breakpoint
CREATE TABLE "build_qty_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid NOT NULL,
	"config_profile_id" uuid NOT NULL,
	"allocated_qty" integer NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"status" "allocation_status" DEFAULT 'active' NOT NULL,
	"ai_source" jsonb,
	"proposal_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "build_qty_allocations_allocated_qty_nonnegative" CHECK ("build_qty_allocations"."allocated_qty" >= 0)
);
--> statement-breakpoint
CREATE TABLE "config_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid NOT NULL,
	"product_revision" text NOT NULL,
	"test_purpose" text NOT NULL,
	"market_or_region" text NOT NULL,
	"variant" text NOT NULL,
	"process_variant" text NOT NULL,
	"material_variant" text NOT NULL,
	"extra_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_source" jsonb,
	"proposal_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "demand_profile_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"functional_team_demand_id" uuid NOT NULL,
	"config_profile_id" uuid NOT NULL,
	"contribution_qty" integer NOT NULL,
	"weight" integer,
	"rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "demand_profile_mappings_contribution_qty_nonnegative" CHECK ("demand_profile_mappings"."contribution_qty" >= 0),
	CONSTRAINT "demand_profile_mappings_weight_nonnegative" CHECK ("demand_profile_mappings"."weight" is null or "demand_profile_mappings"."weight" >= 0)
);
--> statement-breakpoint
CREATE TABLE "functional_team_demands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid NOT NULL,
	"team" text NOT NULL,
	"purpose" text NOT NULL,
	"requested_qty" integer NOT NULL,
	"priority" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_source" jsonb,
	"proposal_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "functional_team_demands_requested_qty_nonnegative" CHECK ("functional_team_demands"."requested_qty" >= 0)
);
--> statement-breakpoint
ALTER TABLE "build_qty_allocations" ADD CONSTRAINT "build_qty_allocations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_qty_allocations" ADD CONSTRAINT "build_qty_allocations_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_qty_allocations" ADD CONSTRAINT "build_qty_allocations_config_profile_id_config_profiles_id_fk" FOREIGN KEY ("config_profile_id") REFERENCES "public"."config_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_profiles" ADD CONSTRAINT "config_profiles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_profiles" ADD CONSTRAINT "config_profiles_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_profile_mappings" ADD CONSTRAINT "demand_profile_mappings_functional_team_demand_id_functional_team_demands_id_fk" FOREIGN KEY ("functional_team_demand_id") REFERENCES "public"."functional_team_demands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_profile_mappings" ADD CONSTRAINT "demand_profile_mappings_config_profile_id_config_profiles_id_fk" FOREIGN KEY ("config_profile_id") REFERENCES "public"."config_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "functional_team_demands" ADD CONSTRAINT "functional_team_demands_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "functional_team_demands" ADD CONSTRAINT "functional_team_demands_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "build_qty_allocations_project_id_idx" ON "build_qty_allocations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "build_qty_allocations_build_stage_id_idx" ON "build_qty_allocations" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "build_qty_allocations_config_profile_id_idx" ON "build_qty_allocations" USING btree ("config_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "build_qty_allocations_active_profile_uidx" ON "build_qty_allocations" USING btree ("config_profile_id") WHERE "build_qty_allocations"."deleted_at" is null and "build_qty_allocations"."status" = 'active';--> statement-breakpoint
CREATE INDEX "config_profiles_project_id_idx" ON "config_profiles" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "config_profiles_build_stage_id_idx" ON "config_profiles" USING btree ("build_stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "config_profiles_stage_structural_key_uidx" ON "config_profiles" USING btree ("build_stage_id","product_revision","test_purpose","market_or_region","variant","process_variant","material_variant") WHERE "config_profiles"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "demand_profile_mappings_demand_id_idx" ON "demand_profile_mappings" USING btree ("functional_team_demand_id");--> statement-breakpoint
CREATE INDEX "demand_profile_mappings_profile_id_idx" ON "demand_profile_mappings" USING btree ("config_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "demand_profile_mappings_demand_profile_uidx" ON "demand_profile_mappings" USING btree ("functional_team_demand_id","config_profile_id") WHERE "demand_profile_mappings"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "functional_team_demands_project_id_idx" ON "functional_team_demands" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "functional_team_demands_build_stage_id_idx" ON "functional_team_demands" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "functional_team_demands_team_idx" ON "functional_team_demands" USING btree ("team");