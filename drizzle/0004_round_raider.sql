ALTER TABLE "organization_members" RENAME COLUMN "organizationId" TO "organization_id";--> statement-breakpoint
ALTER TABLE "organization_members" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_memebers_unique";--> statement-breakpoint
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_organizationId_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_memebers_unique" UNIQUE("organization_id","user_id");