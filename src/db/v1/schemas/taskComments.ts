import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.ts";
import { trackChanges } from "../../utils/trackChanges.ts";
import { tasks } from "./tasks.ts";

const taskComments = pgTable("task_comments", {
  id: uuid().defaultRandom().primaryKey(),
  content: text().notNull(),
  taskId: uuid("task_id").notNull().references(() => tasks.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  ...trackChanges,
});

export { taskComments };
