ALTER TABLE "task_activities" DROP CONSTRAINT "task_activities_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task_activities" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;