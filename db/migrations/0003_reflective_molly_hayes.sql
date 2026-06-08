CREATE TYPE "public"."matrix_readiness_status" AS ENUM('greenlight', 'at_risk', 'blocked');--> statement-breakpoint
CREATE TABLE "build_matrix_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid NOT NULL,
	"config_profile_id" uuid NOT NULL,
	"build_qty_allocation_id" uuid NOT NULL,
	"build_process_route" text NOT NULL,
	"key_material_variant" text NOT NULL,
	"process_owner_team" text DEFAULT '' NOT NULL,
	"material_owner_team" text DEFAULT '' NOT NULL,
	"readiness_status" "matrix_readiness_status" DEFAULT 'at_risk' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"ai_source" jsonb,
	"proposal_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "build_matrix_entries" ADD CONSTRAINT "build_matrix_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_matrix_entries" ADD CONSTRAINT "build_matrix_entries_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_matrix_entries" ADD CONSTRAINT "build_matrix_entries_config_profile_id_config_profiles_id_fk" FOREIGN KEY ("config_profile_id") REFERENCES "public"."config_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_matrix_entries" ADD CONSTRAINT "build_matrix_entries_build_qty_allocation_id_build_qty_allocations_id_fk" FOREIGN KEY ("build_qty_allocation_id") REFERENCES "public"."build_qty_allocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "build_matrix_entries_project_id_idx" ON "build_matrix_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "build_matrix_entries_build_stage_id_idx" ON "build_matrix_entries" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "build_matrix_entries_config_profile_id_idx" ON "build_matrix_entries" USING btree ("config_profile_id");--> statement-breakpoint
CREATE INDEX "build_matrix_entries_allocation_id_idx" ON "build_matrix_entries" USING btree ("build_qty_allocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "build_matrix_entries_active_allocation_uidx" ON "build_matrix_entries" USING btree ("build_qty_allocation_id") WHERE "build_matrix_entries"."deleted_at" is null;