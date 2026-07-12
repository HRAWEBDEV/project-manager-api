import { pgTable, uuid, pgEnum } from "drizzle-orm/pg-core";
import { organizationMembers } from "./organizationMembers";
import { workspaces } from "./workspaces";

const roleEnum = pgEnum("workspace_roles", ["admin", "member"]);

const workspaceMembers = pgTable("workspace_members", {
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, {
      onDelete: "cascade",
    }),
  role: roleEnum("role").notNull().default("member"),
});
