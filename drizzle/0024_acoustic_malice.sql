CREATE TABLE "task_approvers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_member_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"approved_at" timestamp with time zone,
	CONSTRAINT "task_approvers_unique_organization_member_id" UNIQUE("organization_member_id","task_id")
);
--> statement-breakpoint
ALTER TABLE "task_approvers" ADD CONSTRAINT "task_approvers_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_approvers" ADD CONSTRAINT "task_approvers_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;