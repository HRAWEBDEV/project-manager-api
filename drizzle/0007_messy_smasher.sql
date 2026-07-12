ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_organization_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_unique" UNIQUE("organization_id","user_id");