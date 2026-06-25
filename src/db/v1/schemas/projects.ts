import { pgTable, uuid, boolean, varchar, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./users";
import { trackChanges } from "../utils/trackChanges";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";

type Project = typeof projects.$inferSelect;

const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, {
        onDelete: "cascade",
      }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    color: varchar("color", { length: 20 }),
    isArchived: boolean("is_archived").default(false),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...trackChanges,
  },
  (table) => [
    unique("projects_workspace_slug_unique").on(table.workspaceId, table.slug),
  ],
);

const selectProjectsSchema = createSelectSchema(projects);
const insertProjectsSchema = createInsertSchema(projects);
const updateProjectsSchema = createUpdateSchema(projects);

export type { Project };
export {
  selectProjectsSchema,
  insertProjectsSchema,
  updateProjectsSchema,
  projects,
};
