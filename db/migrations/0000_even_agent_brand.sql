CREATE TYPE "public"."build_stage_status" AS ENUM('draft', 'active', 'baselined', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'active', 'baselined', 'archived');--> statement-breakpoint
CREATE TABLE "build_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"description" text NOT NULL,
	"stage_order" integer NOT NULL,
	"template_source" text,
	"override_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "build_stage_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "build_stages" ADD CONSTRAINT "build_stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "build_stages_project_id_idx" ON "build_stages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "build_stages_project_order_idx" ON "build_stages" USING btree ("project_id","stage_order");--> statement-breakpoint
CREATE INDEX "build_stages_status_idx" ON "build_stages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_owner_user_id_idx" ON "projects" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");