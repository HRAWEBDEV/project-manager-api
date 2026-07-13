import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { trackChanges } from "../utils/trackChanges";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

type Workspace = typeof workspaces.$inferSelect;
type InsertWorkspace = typeof workspaces.$inferInsert;

const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, {
      onDelete: "cascade",
    }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  description: text("description"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  ...trackChanges,
});

const insertWorkspaceSchema = createInsertSchema(workspaces);
const updateWorkspaceSchema = createUpdateSchema(workspaces);

export type { Workspace, InsertWorkspace };
export { workspaces, insertWorkspaceSchema, updateWorkspaceSchema };
