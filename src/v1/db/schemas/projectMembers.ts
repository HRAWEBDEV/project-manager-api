import { pgTable, unique, uuid, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { workspaceMembers } from "./workspaceMembers";
import { users } from "./users";

type ProjectMember = typeof projectMembers.$inferSelect;

const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    workspaceMemberId: uuid("workspace_member_id")
      .notNull()
      .references(() => workspaceMembers.id),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    addedBy: uuid("added_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("project_members_unique").on(
      table.projectId,
      table.workspaceMemberId,
    ),
  ],
);

export type { ProjectMember };
export { projectMembers };
