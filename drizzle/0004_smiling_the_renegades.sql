ALTER TABLE "assignees" RENAME COLUMN "task-id" TO "task_id";--> statement-breakpoint
ALTER TABLE "assignees" DROP CONSTRAINT "assignees_task-id_project-member-id_unique";--> statement-breakpoint
ALTER TABLE "assignees" DROP CONSTRAINT "assignees_task-id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "assignees" ADD CONSTRAINT "assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignees" ADD CONSTRAINT "assignees_task_id_project-member-id_unique" UNIQUE("task_id","project-member-id");