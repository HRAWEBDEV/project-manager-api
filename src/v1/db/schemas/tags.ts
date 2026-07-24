import { pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { trackChanges } from "../utils/trackChanges";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";

type Tag = typeof tags.$inferSelect;
type InsertTag = typeof tags.$inferInsert;

const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }),
    createdAt: trackChanges.createdAt,
  },
  (table) => [
    unique("tag_workspace_name_unique").on(table.name, table.workspaceId),
  ],
);

const selectTagSchema = createSelectSchema(tags);
const insertTagSchema = createInsertSchema(tags);

export type { Tag, InsertTag };
export { tags, selectTagSchema, insertTagSchema };
