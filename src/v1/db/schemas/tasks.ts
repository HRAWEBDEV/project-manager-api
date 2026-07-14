import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { trackChanges } from "../utils/trackChanges";

const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    startAt: timestamp("start_at"),
    endAt: timestamp("end_at"),
    completedAt: timestamp("completed_at"),
    parentTaskId: uuid("parent_task_id"),
    ...trackChanges,
  },
  (table) => [
    foreignKey({
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
      name: "tasks_parent_task_id_fkey",
    }),
  ],
);

export { tasks };
