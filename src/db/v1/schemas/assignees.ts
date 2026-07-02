import { pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";
import { projectMembers } from "./projectMember";
import { tasks } from "./tasks";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";

type Assignee = typeof assignees.$inferSelect;

const assignees = pgTable(
  "assignees",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    taskId: uuid("task-id")
      .notNull()
      .references(() => tasks.id),
    projectMemberId: uuid("project-member-id")
      .notNull()
      .references(() => projectMembers.id),
    createdAt: trackChanges["createdAt"],
  },
  (table) => [unique().on(table.taskId, table.projectMemberId)],
);

const selectAssigneeSchema = createSelectSchema(assignees);
const insertAssigneeSchema = createInsertSchema(assignees);
const updateAssigneeSchema = createUpdateSchema(assignees);

export type { Assignee };
export {
  assignees,
  selectAssigneeSchema,
  insertAssigneeSchema,
  updateAssigneeSchema,
};
