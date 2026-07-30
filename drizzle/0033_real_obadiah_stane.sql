CREATE TYPE "public"."workspace_activity_type" AS ENUM('created', 'updated', 'deleted', 'member_added', 'member_removed');--> statement-breakpoint
CREATE TABLE "workspace_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"organization_members_id" uuid NOT NULL,
	"activity_type" "workspace_activity_type" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_activities" ADD CONSTRAINT "workspace_activities_organization_members_id_organization_members_id_fk" FOREIGN KEY ("organization_members_id") REFERENCES "public"."organization_members"("id") ON DELETE cascade ON UPDATE no action;