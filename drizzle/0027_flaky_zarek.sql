CREATE TYPE "public"."task_activity_type" AS ENUM('created', 'updated', 'deleted');--> statement-breakpoint
CREATE TABLE "task_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"organization_members_id" uuid NOT NULL,
	"activity_type" "task_activity_type" NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_organization_members_id_organization_members_id_fk" FOREIGN KEY ("organization_members_id") REFERENCES "public"."organization_members"("id") ON DELETE cascade ON UPDATE no action;