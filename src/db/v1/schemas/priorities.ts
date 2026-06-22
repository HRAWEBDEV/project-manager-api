import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { trackChanges } from "../utils/trackChanges";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";

type Priority = typeof priorities.$inferSelect;

const priorities = pgTable("priorities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("name").notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  createdAt: trackChanges.createdAt,
});

const selectPrioritySchema = createSelectSchema(priorities);
const insertPrioritySchema = createInsertSchema(priorities);
const updatePrioritySchema = createUpdateSchema(priorities);

export type { Priority };
export {
  priorities,
  selectPrioritySchema,
  insertPrioritySchema,
  updatePrioritySchema,
};
