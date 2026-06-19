import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { boards } from "./boards";
import { users } from "./users";
import { projects } from "./projects";
import { trackChanges } from "../utils/trackChanges";
import { createSelectSchema } from "drizzle-zod";

type Task = typeof tasks.$inferSelect;

const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id").references(() => boards.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    parentTaskId: uuid("parent_task_id"),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    startDate: timestamp("start_date", {
      withTimezone: true,
    }),
    dueDate: timestamp("due_date", {
      withTimezone: true,
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),
    isArchived: boolean("is_archived").notNull().default(false),
    ...trackChanges,
  },
  (table) => [
    foreignKey({
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
      name: "tasks_parent_task_id_fkey",
    }).onDelete("cascade"),
  ],
);

const selectTaskSchema = createSelectSchema(tasks);

export type { Task };
export { tasks, selectTaskSchema };
