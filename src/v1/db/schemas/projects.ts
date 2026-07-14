import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { workspaces } from "./workspaces";
import { users } from "./users";
import { trackChanges } from "../utils/trackChanges";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

type Project = typeof projects.$inferSelect;
type InsertProject = typeof projects.$inferInsert;

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

const insertProjectSchema = createInsertSchema(projects);
const updateProjectSchema = createUpdateSchema(projects);

export type { Project, InsertProject };
export { projects, insertProjectSchema, updateProjectSchema };
