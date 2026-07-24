import { pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { tags } from "./tags";
import { tasks } from "./tasks";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";

type TaskTag = typeof taskTags.$inferSelect;
type InsertTaskTag = typeof taskTags.$inferInsert;

const taskTags = pgTable(
  "task_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [
    unique("task_tags_task_id_tag_id_unique").on(table.taskId, table.tagId),
  ],
);

const selectTaskTagSchema = createSelectSchema(taskTags);
const insertTaskTagSchema = createInsertSchema(taskTags);

export type { TaskTag, InsertTaskTag };
export { taskTags, selectTaskTagSchema, insertTaskTagSchema };
