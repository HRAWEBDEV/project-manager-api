ALTER TABLE "project_members" RENAME COLUMN "workspace_member_id" TO "organization_member_id";--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_unique";--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_workspace_member_id_workspace_members_id_fk";
--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_unique" UNIQUE("project_id","organization_member_id");