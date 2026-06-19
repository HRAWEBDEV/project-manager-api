ALTER TABLE "project_members" RENAME COLUMN "projectId" TO "project_id";--> statement-breakpoint
ALTER TABLE "project_members" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "projectId_userId_unique";--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_projectId_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "projectId_userId_unique" UNIQUE("project_id","user_id");