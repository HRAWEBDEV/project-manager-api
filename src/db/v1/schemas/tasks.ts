import { PgColumn, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { trackChanges } from "../../utils/trackChanges.ts";
import { users } from "./users.ts";
import { status } from "./status.ts";

const tasks = pgTable("tasks", {
  id: uuid().defaultRandom().primaryKey(),
  statusId: uuid("status_id").notNull().references(() => status.id),
  taskId: uuid("task_id").references((): PgColumn => tasks.id),
  title: text().notNull(),
  description: text().notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  fromDate: timestamp("from_date", { withTimezone: true }).notNull(),
  toDate: timestamp("to_date", { withTimezone: true }).notNull(),
  ...trackChanges,
});

export { tasks };
