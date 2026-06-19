ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" DROP COLUMN "user_id";