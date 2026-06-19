ALTER TABLE "boards" ALTER COLUMN "projectId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET NOT NULL;