import { pgTable, uuid, pgEnum, unique } from "drizzle-orm/pg-core";
import { organizationMembers } from "./organizationMembers";
import { workspaces } from "./workspaces";

export const roleEnum = pgEnum("workspace_roles", ["admin", "member"]);

type WorkspaceMember = typeof workspaceMembers.$inferSelect;

const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().notNull(),
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
  },
  (table) => [
    unique("workspace_members_unique").on(
      table.organizationMemberId,
      table.workspaceId,
    ),
  ],
);

export type { WorkspaceMember };
export { workspaceMembers };
