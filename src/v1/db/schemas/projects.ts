import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { workspaces } from "./workspaces";
import { users } from "./users";
import { trackChanges } from "../utils/trackChanges";

type Project = typeof projects.$inferSelect;

const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: text("icon"),
  color: varchar("color", { length: 20 }),
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => users.id),
  archived: boolean("archived").default(false).notNull(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  ...trackChanges,
});

export type { Project };
export { projects };
