import { pgTable, timestamp, unique, uuid, boolean } from "drizzle-orm/pg-core";
import { organizationMembers } from "./organizationMembers";
import { tasks } from "./tasks";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";

type TaskApprovers = typeof taskApprovers.$inferSelect;
type InsertTaskApprovers = typeof taskApprovers.$inferInsert;

const taskApprovers = pgTable(
  "task_approvers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationMemberId: uuid("organization_member_id")
      .notNull()
      .references(() => organizationMembers.id),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
    approved: boolean("approved").notNull().default(false),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [
    unique("task_approvers_unique_organization_member_id").on(
      table.organizationMemberId,
      table.taskId,
    ),
  ],
);

const selectTaskApproversSchema = createSelectSchema(taskApprovers);
const insertTaskApproversSchema = createInsertSchema(taskApprovers);
const updateTaskApproversSchema = createUpdateSchema(taskApprovers);

export type { TaskApprovers, InsertTaskApprovers };
export {
  taskApprovers,
  selectTaskApproversSchema,
  insertTaskApproversSchema,
  updateTaskApproversSchema,
};
