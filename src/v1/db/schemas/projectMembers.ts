import { pgTable, unique, uuid, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { organizationMembers } from "./organizationMembers";
import { users } from "./users";

type ProjectMember = typeof projectMembers.$inferSelect;
type InsertProjectMember = typeof projectMembers.$inferInsert;

const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    organizationMemberId: uuid("organization_member_id")
      .notNull()
      .references(() => organizationMembers.id),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    addedBy: uuid("added_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("project_members_unique").on(
      table.projectId,
      table.organizationMemberId,
    ),
  ],
);

export type { ProjectMember, InsertProjectMember };
export { projectMembers };
