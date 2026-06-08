CREATE TYPE "public"."ai_audit_event_type" AS ENUM('run_started', 'run_succeeded', 'run_failed', 'proposal_created', 'proposal_reviewed', 'operation_validated', 'operation_applied', 'operation_failed');--> statement-breakpoint
CREATE TYPE "public"."ai_human_disposition" AS ENUM('pending', 'accepted', 'rejected', 'revised');--> statement-breakpoint
CREATE TYPE "public"."ai_operation_status" AS ENUM('pending', 'validated', 'rejected', 'revised', 'applied', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."ai_proposal_status" AS ENUM('pending', 'accepted', 'rejected', 'revised', 'applied', 'partially_applied', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_run_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "ai_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid,
	"ai_agent_id" uuid,
	"ai_run_id" uuid,
	"ai_proposal_id" uuid,
	"ai_operation_id" uuid,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"event_type" "ai_audit_event_type" NOT NULL,
	"event_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ai_proposal_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"input_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"confidence" integer,
	"validation_status" "ai_operation_status" DEFAULT 'pending' NOT NULL,
	"execution_status" "ai_operation_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_operations_confidence_range" CHECK ("ai_operations"."confidence" is null or ("ai_operations"."confidence" >= 0 and "ai_operations"."confidence" <= 100))
);
--> statement-breakpoint
CREATE TABLE "ai_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid,
	"ai_run_id" uuid,
	"proposal_type" text NOT NULL,
	"status" "ai_proposal_status" DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"source_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"confidence" integer,
	"human_disposition" "ai_human_disposition" DEFAULT 'pending' NOT NULL,
	"reviewer_user_id" text,
	"reviewed_at" timestamp with time zone,
	"review_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_proposals_confidence_range" CHECK ("ai_proposals"."confidence" is null or ("ai_proposals"."confidence" >= 0 and "ai_proposals"."confidence" <= 100))
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid,
	"ai_agent_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" "ai_run_status" DEFAULT 'running' NOT NULL,
	"input_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"context_summary" text DEFAULT '' NOT NULL,
	"output_summary" text DEFAULT '' NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_audit_events" ADD CONSTRAINT "ai_audit_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit_events" ADD CONSTRAINT "ai_audit_events_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit_events" ADD CONSTRAINT "ai_audit_events_ai_agent_id_ai_agents_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit_events" ADD CONSTRAINT "ai_audit_events_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit_events" ADD CONSTRAINT "ai_audit_events_ai_proposal_id_ai_proposals_id_fk" FOREIGN KEY ("ai_proposal_id") REFERENCES "public"."ai_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_audit_events" ADD CONSTRAINT "ai_audit_events_ai_operation_id_ai_operations_id_fk" FOREIGN KEY ("ai_operation_id") REFERENCES "public"."ai_operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_operations" ADD CONSTRAINT "ai_operations_ai_proposal_id_ai_proposals_id_fk" FOREIGN KEY ("ai_proposal_id") REFERENCES "public"."ai_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_proposals" ADD CONSTRAINT "ai_proposals_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_ai_agent_id_ai_agents_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_agents_provider_model_idx" ON "ai_agents" USING btree ("provider","model");--> statement-breakpoint
CREATE INDEX "ai_agents_status_idx" ON "ai_agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_audit_events_project_id_idx" ON "ai_audit_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_audit_events_build_stage_id_idx" ON "ai_audit_events" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "ai_audit_events_agent_id_idx" ON "ai_audit_events" USING btree ("ai_agent_id");--> statement-breakpoint
CREATE INDEX "ai_audit_events_run_id_idx" ON "ai_audit_events" USING btree ("ai_run_id");--> statement-breakpoint
CREATE INDEX "ai_audit_events_proposal_id_idx" ON "ai_audit_events" USING btree ("ai_proposal_id");--> statement-breakpoint
CREATE INDEX "ai_audit_events_operation_id_idx" ON "ai_audit_events" USING btree ("ai_operation_id");--> statement-breakpoint
CREATE INDEX "ai_audit_events_event_type_idx" ON "ai_audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "ai_audit_events_created_at_idx" ON "ai_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_operations_proposal_id_idx" ON "ai_operations" USING btree ("ai_proposal_id");--> statement-breakpoint
CREATE INDEX "ai_operations_type_idx" ON "ai_operations" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "ai_operations_target_idx" ON "ai_operations" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "ai_operations_validation_status_idx" ON "ai_operations" USING btree ("validation_status");--> statement-breakpoint
CREATE INDEX "ai_operations_execution_status_idx" ON "ai_operations" USING btree ("execution_status");--> statement-breakpoint
CREATE INDEX "ai_proposals_project_id_idx" ON "ai_proposals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_proposals_build_stage_id_idx" ON "ai_proposals" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "ai_proposals_run_id_idx" ON "ai_proposals" USING btree ("ai_run_id");--> statement-breakpoint
CREATE INDEX "ai_proposals_status_idx" ON "ai_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_proposals_disposition_idx" ON "ai_proposals" USING btree ("human_disposition");--> statement-breakpoint
CREATE INDEX "ai_runs_project_id_idx" ON "ai_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_runs_build_stage_id_idx" ON "ai_runs" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "ai_runs_agent_id_idx" ON "ai_runs" USING btree ("ai_agent_id");--> statement-breakpoint
CREATE INDEX "ai_runs_status_idx" ON "ai_runs" USING btree ("status");