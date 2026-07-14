CREATE TABLE "task_assignees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"organization_member_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_assignee_unique_member" UNIQUE("task_id","organization_member_id")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_organization_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."organization_members"("id") ON DELETE set null ON UPDATE no action;