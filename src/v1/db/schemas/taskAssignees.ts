import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { organizationMembers } from "./organizationMembers";

const taskAssignees = pgTable(
  "task_assignees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "cascade",
    }),
    organizationMemberId: uuid("organization_member_id").references(
      () => organizationMembers.id,
      {
        onDelete: "cascade",
      },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("task_assignee_unique_member").on(
      table.taskId,
      table.organizationMemberId,
    ),
  ],
);

export { taskAssignees };
