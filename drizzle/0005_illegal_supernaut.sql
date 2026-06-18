ALTER TABLE "sessions" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;