CREATE TYPE "public"."blocker_status" AS ENUM('open', 'mitigating', 'resolved', 'accepted_risk');--> statement-breakpoint
CREATE TYPE "public"."readiness_status" AS ENUM('greenlight', 'at_risk', 'blocked');--> statement-breakpoint
CREATE TABLE "blockers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid,
	"readiness_signal_id" uuid,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "blocker_status" DEFAULT 'open' NOT NULL,
	"severity" text NOT NULL,
	"owner_team" text NOT NULL,
	"owner_user_id" text DEFAULT '' NOT NULL,
	"impact" text NOT NULL,
	"due_date" timestamp with time zone,
	"mitigation" text DEFAULT '' NOT NULL,
	"decision_needed" boolean DEFAULT false NOT NULL,
	"ai_source" jsonb,
	"proposal_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "readiness_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid,
	"readiness_signal_id" uuid,
	"readiness_rollup_id" uuid,
	"blocker_id" uuid,
	"readiness_signoff_id" uuid,
	"actor_user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"field_name" text DEFAULT '' NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readiness_rollups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"status" "readiness_status" DEFAULT 'greenlight' NOT NULL,
	"source_signal_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "readiness_rollups_source_signal_count_nonnegative" CHECK ("readiness_rollups"."source_signal_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "readiness_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"status" "readiness_status" DEFAULT 'at_risk' NOT NULL,
	"owner_team" text DEFAULT '' NOT NULL,
	"owner_user_id" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"override_reason" text DEFAULT '' NOT NULL,
	"ai_source" jsonb,
	"proposal_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "readiness_signoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"readiness_signal_id" uuid NOT NULL,
	"signer_user_id" text NOT NULL,
	"disposition" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_readiness_signal_id_readiness_signals_id_fk" FOREIGN KEY ("readiness_signal_id") REFERENCES "public"."readiness_signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_audit_logs" ADD CONSTRAINT "readiness_audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_audit_logs" ADD CONSTRAINT "readiness_audit_logs_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_audit_logs" ADD CONSTRAINT "readiness_audit_logs_readiness_signal_id_readiness_signals_id_fk" FOREIGN KEY ("readiness_signal_id") REFERENCES "public"."readiness_signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_audit_logs" ADD CONSTRAINT "readiness_audit_logs_readiness_rollup_id_readiness_rollups_id_fk" FOREIGN KEY ("readiness_rollup_id") REFERENCES "public"."readiness_rollups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_audit_logs" ADD CONSTRAINT "readiness_audit_logs_blocker_id_blockers_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."blockers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_audit_logs" ADD CONSTRAINT "readiness_audit_logs_readiness_signoff_id_readiness_signoffs_id_fk" FOREIGN KEY ("readiness_signoff_id") REFERENCES "public"."readiness_signoffs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_rollups" ADD CONSTRAINT "readiness_rollups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_rollups" ADD CONSTRAINT "readiness_rollups_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_signals" ADD CONSTRAINT "readiness_signals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_signals" ADD CONSTRAINT "readiness_signals_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_signoffs" ADD CONSTRAINT "readiness_signoffs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_signoffs" ADD CONSTRAINT "readiness_signoffs_readiness_signal_id_readiness_signals_id_fk" FOREIGN KEY ("readiness_signal_id") REFERENCES "public"."readiness_signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blockers_project_id_idx" ON "blockers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "blockers_build_stage_id_idx" ON "blockers" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "blockers_readiness_signal_id_idx" ON "blockers" USING btree ("readiness_signal_id");--> statement-breakpoint
CREATE INDEX "blockers_target_idx" ON "blockers" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "blockers_status_idx" ON "blockers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blockers_due_date_idx" ON "blockers" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "readiness_audit_logs_project_id_idx" ON "readiness_audit_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "readiness_audit_logs_build_stage_id_idx" ON "readiness_audit_logs" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "readiness_audit_logs_signal_id_idx" ON "readiness_audit_logs" USING btree ("readiness_signal_id");--> statement-breakpoint
CREATE INDEX "readiness_audit_logs_rollup_id_idx" ON "readiness_audit_logs" USING btree ("readiness_rollup_id");--> statement-breakpoint
CREATE INDEX "readiness_audit_logs_blocker_id_idx" ON "readiness_audit_logs" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "readiness_audit_logs_signoff_id_idx" ON "readiness_audit_logs" USING btree ("readiness_signoff_id");--> statement-breakpoint
CREATE INDEX "readiness_audit_logs_created_at_idx" ON "readiness_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "readiness_rollups_project_id_idx" ON "readiness_rollups" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "readiness_rollups_build_stage_id_idx" ON "readiness_rollups" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "readiness_rollups_target_idx" ON "readiness_rollups" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "readiness_rollups_target_uidx" ON "readiness_rollups" USING btree ("project_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "readiness_signals_project_id_idx" ON "readiness_signals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "readiness_signals_build_stage_id_idx" ON "readiness_signals" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "readiness_signals_target_idx" ON "readiness_signals" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "readiness_signals_status_idx" ON "readiness_signals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "readiness_signals_active_target_uidx" ON "readiness_signals" USING btree ("project_id","target_type","target_id") WHERE "readiness_signals"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "readiness_signoffs_project_id_idx" ON "readiness_signoffs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "readiness_signoffs_signal_id_idx" ON "readiness_signoffs" USING btree ("readiness_signal_id");--> statement-breakpoint
CREATE INDEX "readiness_signoffs_signer_idx" ON "readiness_signoffs" USING btree ("signer_user_id");