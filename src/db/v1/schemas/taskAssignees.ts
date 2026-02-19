import { pgTable, uuid } from "drizzle-orm/pg-core";
import { tasks } from "./tasks.ts";
import { users } from "./users.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const taskAssignees = pgTable("task_assignees", {
  id: uuid().defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  ...trackChanges,
});

export { taskAssignees };
