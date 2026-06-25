ALTER TABLE "priorities" ADD CONSTRAINT "priorities_key_unique" UNIQUE("key");--> statement-breakpoint
ALTER TABLE "priorities" ADD CONSTRAINT "priorities_title_unique" UNIQUE("title");--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_key_unique" UNIQUE("key");--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_title_unique" UNIQUE("title");