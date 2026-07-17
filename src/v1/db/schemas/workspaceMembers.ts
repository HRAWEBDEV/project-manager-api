import { pgTable, uuid, pgEnum, unique, timestamp } from "drizzle-orm/pg-core";
import { organizationMembers } from "./organizationMembers";
import { workspaces } from "./workspaces";
import { users } from "./users";
import { createSelectSchema } from "drizzle-zod";
import { createInsertSchema } from "drizzle-zod";

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
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

const selectWorkspaceMemberSchema = createSelectSchema(workspaceMembers);
const insertWorkspaceMember = createInsertSchema(workspaceMembers);

export type { WorkspaceMember, InsertWorkspaceMember };
export { workspaceMembers, selectWorkspaceMemberSchema, insertWorkspaceMember };
