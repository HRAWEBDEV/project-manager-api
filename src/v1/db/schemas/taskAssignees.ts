import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { organizationMembers } from "./organizationMembers";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";

type TaskAssignee = typeof taskAssignees.$inferSelect;
type InsertTaskAssignee = typeof taskAssignees.$inferInsert;

const taskAssignees = pgTable(
  "task_assignees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, {
        onDelete: "cascade",
      }),
    organizationMemberId: uuid("organization_member_id")
      .notNull()
      .references(() => organizationMembers.id, {
        onDelete: "cascade",
      }),
  },
  (table) => [
    unique("task_assignee_unique_member").on(
      table.taskId,
      table.organizationMemberId,
    ),
  ],
);

const selectTaskAssignee = createSelectSchema(taskAssignees);
const insertTaskAssignee = createInsertSchema(taskAssignees);
const updateTaskAssignee = createUpdateSchema(taskAssignees);

export type { TaskAssignee, InsertTaskAssignee };
export {
  selectTaskAssignee,
  insertTaskAssignee,
  updateTaskAssignee,
  taskAssignees,
};
