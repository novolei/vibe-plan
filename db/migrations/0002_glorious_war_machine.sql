CREATE TABLE "allocation_change_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid NOT NULL,
	"build_qty_allocation_id" uuid NOT NULL,
	"config_profile_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"field_name" text NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "allocation_change_logs" ADD CONSTRAINT "allocation_change_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_change_logs" ADD CONSTRAINT "allocation_change_logs_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_change_logs" ADD CONSTRAINT "allocation_change_logs_build_qty_allocation_id_build_qty_allocations_id_fk" FOREIGN KEY ("build_qty_allocation_id") REFERENCES "public"."build_qty_allocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_change_logs" ADD CONSTRAINT "allocation_change_logs_config_profile_id_config_profiles_id_fk" FOREIGN KEY ("config_profile_id") REFERENCES "public"."config_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allocation_change_logs_project_id_idx" ON "allocation_change_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "allocation_change_logs_build_stage_id_idx" ON "allocation_change_logs" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "allocation_change_logs_allocation_id_idx" ON "allocation_change_logs" USING btree ("build_qty_allocation_id");--> statement-breakpoint
CREATE INDEX "allocation_change_logs_config_profile_id_idx" ON "allocation_change_logs" USING btree ("config_profile_id");--> statement-breakpoint
CREATE INDEX "allocation_change_logs_created_at_idx" ON "allocation_change_logs" USING btree ("created_at");