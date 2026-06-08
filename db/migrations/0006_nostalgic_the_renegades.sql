CREATE TYPE "public"."schedule_dependency_type" AS ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');--> statement-breakpoint
CREATE TYPE "public"."schedule_task_status" AS ENUM('todo', 'in_progress', 'done', 'blocked', 'canceled');--> statement-breakpoint
CREATE TABLE "schedule_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid,
	"schedule_task_id" uuid,
	"schedule_dependency_id" uuid,
	"schedule_worklog_id" uuid,
	"actor_user_id" text NOT NULL,
	"changed_field" text DEFAULT '' NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"predecessor_task_id" uuid NOT NULL,
	"successor_task_id" uuid NOT NULL,
	"dependency_type" "schedule_dependency_type" DEFAULT 'finish_to_start' NOT NULL,
	"lag_days" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "schedule_dependencies_no_self_dependency" CHECK ("schedule_dependencies"."predecessor_task_id" <> "schedule_dependencies"."successor_task_id")
);
--> statement-breakpoint
CREATE TABLE "schedule_task_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"schedule_task_id" uuid NOT NULL,
	"linked_object_type" text NOT NULL,
	"linked_object_id" text NOT NULL,
	"link_role" text DEFAULT 'primary' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "schedule_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"build_stage_id" uuid NOT NULL,
	"parent_task_id" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"task_type" text DEFAULT 'build_plan' NOT NULL,
	"status" "schedule_task_status" DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"owner_user_id" text NOT NULL,
	"assignee_user_id" text DEFAULT '' NOT NULL,
	"planned_start_date" timestamp with time zone NOT NULL,
	"planned_end_date" timestamp with time zone NOT NULL,
	"actual_start_date" timestamp with time zone,
	"actual_end_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_days" integer DEFAULT 0 NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"ai_source" jsonb,
	"proposal_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "schedule_tasks_duration_days_nonnegative" CHECK ("schedule_tasks"."duration_days" >= 0),
	CONSTRAINT "schedule_tasks_progress_percent_range" CHECK ("schedule_tasks"."progress_percent" >= 0 and "schedule_tasks"."progress_percent" <= 100),
	CONSTRAINT "schedule_tasks_planned_date_order" CHECK ("schedule_tasks"."planned_end_date" >= "schedule_tasks"."planned_start_date")
);
--> statement-breakpoint
CREATE TABLE "schedule_worklogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"schedule_task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"work_date" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"blocker_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "schedule_worklogs_duration_minutes_nonnegative" CHECK ("schedule_worklogs"."duration_minutes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "schedule_audit_logs" ADD CONSTRAINT "schedule_audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_audit_logs" ADD CONSTRAINT "schedule_audit_logs_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_audit_logs" ADD CONSTRAINT "schedule_audit_logs_schedule_task_id_schedule_tasks_id_fk" FOREIGN KEY ("schedule_task_id") REFERENCES "public"."schedule_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_audit_logs" ADD CONSTRAINT "schedule_audit_logs_schedule_dependency_id_schedule_dependencies_id_fk" FOREIGN KEY ("schedule_dependency_id") REFERENCES "public"."schedule_dependencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_audit_logs" ADD CONSTRAINT "schedule_audit_logs_schedule_worklog_id_schedule_worklogs_id_fk" FOREIGN KEY ("schedule_worklog_id") REFERENCES "public"."schedule_worklogs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_dependencies" ADD CONSTRAINT "schedule_dependencies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_dependencies" ADD CONSTRAINT "schedule_dependencies_predecessor_task_id_schedule_tasks_id_fk" FOREIGN KEY ("predecessor_task_id") REFERENCES "public"."schedule_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_dependencies" ADD CONSTRAINT "schedule_dependencies_successor_task_id_schedule_tasks_id_fk" FOREIGN KEY ("successor_task_id") REFERENCES "public"."schedule_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_task_links" ADD CONSTRAINT "schedule_task_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_task_links" ADD CONSTRAINT "schedule_task_links_schedule_task_id_schedule_tasks_id_fk" FOREIGN KEY ("schedule_task_id") REFERENCES "public"."schedule_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_tasks" ADD CONSTRAINT "schedule_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_tasks" ADD CONSTRAINT "schedule_tasks_build_stage_id_build_stages_id_fk" FOREIGN KEY ("build_stage_id") REFERENCES "public"."build_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_worklogs" ADD CONSTRAINT "schedule_worklogs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_worklogs" ADD CONSTRAINT "schedule_worklogs_schedule_task_id_schedule_tasks_id_fk" FOREIGN KEY ("schedule_task_id") REFERENCES "public"."schedule_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_audit_logs_project_id_idx" ON "schedule_audit_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "schedule_audit_logs_build_stage_id_idx" ON "schedule_audit_logs" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "schedule_audit_logs_task_id_idx" ON "schedule_audit_logs" USING btree ("schedule_task_id");--> statement-breakpoint
CREATE INDEX "schedule_audit_logs_dependency_id_idx" ON "schedule_audit_logs" USING btree ("schedule_dependency_id");--> statement-breakpoint
CREATE INDEX "schedule_audit_logs_worklog_id_idx" ON "schedule_audit_logs" USING btree ("schedule_worklog_id");--> statement-breakpoint
CREATE INDEX "schedule_audit_logs_created_at_idx" ON "schedule_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "schedule_dependencies_project_id_idx" ON "schedule_dependencies" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "schedule_dependencies_predecessor_idx" ON "schedule_dependencies" USING btree ("predecessor_task_id");--> statement-breakpoint
CREATE INDEX "schedule_dependencies_successor_idx" ON "schedule_dependencies" USING btree ("successor_task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_dependencies_active_pair_uidx" ON "schedule_dependencies" USING btree ("predecessor_task_id","successor_task_id","dependency_type") WHERE "schedule_dependencies"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "schedule_task_links_project_id_idx" ON "schedule_task_links" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "schedule_task_links_task_id_idx" ON "schedule_task_links" USING btree ("schedule_task_id");--> statement-breakpoint
CREATE INDEX "schedule_task_links_object_idx" ON "schedule_task_links" USING btree ("linked_object_type","linked_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_task_links_active_task_object_uidx" ON "schedule_task_links" USING btree ("schedule_task_id","linked_object_type","linked_object_id") WHERE "schedule_task_links"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "schedule_tasks_project_id_idx" ON "schedule_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "schedule_tasks_build_stage_id_idx" ON "schedule_tasks" USING btree ("build_stage_id");--> statement-breakpoint
CREATE INDEX "schedule_tasks_parent_task_id_idx" ON "schedule_tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "schedule_tasks_status_idx" ON "schedule_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schedule_tasks_planned_dates_idx" ON "schedule_tasks" USING btree ("planned_start_date","planned_end_date");--> statement-breakpoint
CREATE INDEX "schedule_worklogs_project_id_idx" ON "schedule_worklogs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "schedule_worklogs_task_id_idx" ON "schedule_worklogs" USING btree ("schedule_task_id");--> statement-breakpoint
CREATE INDEX "schedule_worklogs_work_date_idx" ON "schedule_worklogs" USING btree ("work_date");