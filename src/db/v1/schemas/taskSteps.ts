import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { trackChanges } from "../../utils/trackChanges.ts";
import { tasks } from "./tasks.ts";

const taskSteps = pgTable("task_steps", {
  id: uuid().defaultRandom().primaryKey(),
  taskId: uuid("trask_id").notNull().references(() => tasks.id),
  description: text().notNull(),
  completed: boolean().default(false),
  ...trackChanges,
});

export { taskSteps };
