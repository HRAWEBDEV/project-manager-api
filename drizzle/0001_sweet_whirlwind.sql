ALTER TABLE "workspaces" DROP CONSTRAINT "workspace_slug_unique";--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "name" SET DATA TYPE varchar(200);--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "slug" varchar(250) NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspace_slug_unique" UNIQUE("organization_id","slug");