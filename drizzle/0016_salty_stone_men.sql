ALTER TABLE "tasks" DROP CONSTRAINT "tasks_board_id_boards_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE set null ON UPDATE no action;