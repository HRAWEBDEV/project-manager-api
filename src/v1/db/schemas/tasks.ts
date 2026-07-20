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
import { organizationMembers } from "./organizationMembers";
import { createSelectSchema } from "drizzle-zod";

const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
      }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    parentTaskId: uuid("parent_task_id"),
    createdBy: uuid("created_by").references(() => organizationMembers.id, {
      onDelete: "set null",
    }),
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

const selectTasksSchema = createSelectSchema(tasks);

export { tasks, selectTasksSchema };
