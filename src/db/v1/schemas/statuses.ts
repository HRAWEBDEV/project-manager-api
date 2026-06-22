import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { trackChanges } from "../utils/trackChanges";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

type Status = typeof statuses.$inferSelect;

const statuses = pgTable("statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("name").notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  createdAt: trackChanges.createdAt,
});

const insertStatusSchema = createInsertSchema(statuses);
const updateStatusSchema = createUpdateSchema(statuses);

export type { Status };
export { statuses, insertStatusSchema, updateStatusSchema };
