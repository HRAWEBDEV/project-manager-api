import { pgTable, uuid, pgEnum, unique, timestamp } from "drizzle-orm/pg-core";
import { organizationMembers } from "./organizationMembers";
import { workspaces } from "./workspaces";
import { users } from "./users";

export const roleEnum = pgEnum("workspace_roles", ["admin", "member"]);

type WorkspaceMember = typeof workspaceMembers.$inferSelect;
type InsertWorkspaceMember = typeof workspaceMembers.$inferInsert;

const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),
    organizationMemberId: uuid("organization_member_id")
      .notNull()
      .references(() => organizationMembers.id, {
        onDelete: "cascade",
      }),
    role: roleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    addedBy: uuid("added_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("workspace_members_unique").on(
      table.organizationMemberId,
      table.workspaceId,
    ),
  ],
);

export type { WorkspaceMember, InsertWorkspaceMember };
export { workspaceMembers };
