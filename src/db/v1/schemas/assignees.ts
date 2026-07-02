import { pgTable, uuid } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";
import { projectMembers } from "./projectMember";
import { tasks } from "./tasks";

type Assignee = typeof assignees.$inferSelect;

const assignees = pgTable("assignees", {
  id: uuid("id").defaultRandom().primaryKey().notNull(),
  taskId: uuid("task-id")
    .notNull()
    .references(() => tasks.id),
  projectMemeberId: uuid("project-member-id")
    .notNull()
    .references(() => projectMembers.id),
  createdAt: trackChanges["createdAt"],
});

export { assignees };
