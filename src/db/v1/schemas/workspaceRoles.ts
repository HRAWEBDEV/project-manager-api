import { pgTable, serial, uuid, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { trackChanges } from "../utils/trackChanges";

type WorkspaceRole = typeof workspaceRoles.$inferSelect;

const roleEnum = pgEnum("role", ["owner", "admin", "member"]);

const workspaceRoles = pgTable("workspace_roles", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, {
      onDelete: "cascade",
    }),
  role: roleEnum().notNull(),
  createdAt: trackChanges["createdAt"],
  updatedAt: trackChanges["updatedAt"],
});

export type { WorkspaceRole };
export { workspaceRoles, roleEnum };
