import { pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./users";

type WorkspaceMember = typeof workspaceMembers.$inferSelect;

const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
  },
  (table) => [
    unique("workspaceId_userId_unique").on(table.workspaceId, table.userId),
  ],
);

export type { WorkspaceMember };
export { workspaceMembers };
