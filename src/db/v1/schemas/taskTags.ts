import { pgTable, uuid } from "drizzle-orm/pg-core";
import { tasks } from "./tasks.ts";
import { tags } from "./tags.ts";

const taskTags = pgTable("task_tags", {
  id: uuid().defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id),
  tagId: uuid("tag_id").notNull().references(() => tags.id),
});

export { taskTags };
