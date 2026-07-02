ALTER TABLE "assignees" DROP CONSTRAINT "assignees_task-id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "assignees" DROP CONSTRAINT "assignees_project-member-id_project_members_id_fk";
--> statement-breakpoint
ALTER TABLE "assignees" ADD CONSTRAINT "assignees_task-id_tasks_id_fk" FOREIGN KEY ("task-id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignees" ADD CONSTRAINT "assignees_project-member-id_project_members_id_fk" FOREIGN KEY ("project-member-id") REFERENCES "public"."project_members"("id") ON DELETE cascade ON UPDATE no action;