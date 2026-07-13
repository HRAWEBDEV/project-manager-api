CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_member_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"added_by" uuid,
	CONSTRAINT "project_members_unique" UNIQUE("project_id","workspace_member_id")
);
--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_workspace_member_id_workspace_members_id_fk" FOREIGN KEY ("workspace_member_id") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;