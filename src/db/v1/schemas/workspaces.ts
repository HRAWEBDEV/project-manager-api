import { pgTable, uuid, text, boolean, unique } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { trackChanges } from "../utils/trackChanges";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

type Workspace = typeof workspaces.$inferSelect;

const workspaces = pgTable(
  "workspaces",
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),
    name: text().notNull(),
    slug: text().notNull(),
    isPrivate: boolean("is_private").notNull().default(false),
    ...trackChanges,
  },
  (table) => [
    unique("workspace_slug_unique").on(table.organizationId, table.slug),
  ],
);

const insertWorkspaceSchema = createInsertSchema(workspaces);
const updateWorkspaceSchema = createUpdateSchema(workspaces);

export type { Workspace };
export { workspaces, insertWorkspaceSchema, updateWorkspaceSchema };
