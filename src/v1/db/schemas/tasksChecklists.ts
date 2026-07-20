import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { trackChanges } from "../utils/trackChanges";

const tasksChecklists = pgTable("tasks_checklists", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, {
      onDelete: "cascade",
    }),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...trackChanges,
});

export { tasksChecklists };
