ALTER TABLE "organization_invitations" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "organization_invitations" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."organization_invitation_status";--> statement-breakpoint
CREATE TYPE "public"."organization_invitation_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
ALTER TABLE "organization_invitations" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."organization_invitation_status";--> statement-breakpoint
ALTER TABLE "organization_invitations" ALTER COLUMN "status" SET DATA TYPE "public"."organization_invitation_status" USING "status"::"public"."organization_invitation_status";