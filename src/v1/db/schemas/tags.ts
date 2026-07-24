import { pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { trackChanges } from "../utils/trackChanges";

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull(),
    createdAt: trackChanges.createdAt,
  },
  (table) => [
    unique("tag_workspace_name_unique").on(table.name, table.workspaceId),
  ],
);
