import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";

type TasksChecklists = typeof tasksChecklists.$inferSelect;
type InsertTasksChecklists = typeof tasksChecklists.$inferInsert;

const tasksChecklists = pgTable("tasks_checklists", {
  id: uuid("id").defaultRandom().primaryKey(),
  sortNo: integer("sort_no").notNull().default(0),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, {
      onDelete: "cascade",
    }),
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

const selectTasksChecklists = createSelectSchema(tasksChecklists);
const insertTasksChecklists = createInsertSchema(tasksChecklists);

export type { TasksChecklists, InsertTasksChecklists };
export { tasksChecklists, selectTasksChecklists, insertTasksChecklists };
