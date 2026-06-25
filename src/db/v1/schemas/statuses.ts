import { pgTable, uuid, serial, varchar } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { trackChanges } from "../utils/trackChanges";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

type Status = typeof statuses.$inferSelect;

const statuses = pgTable("statuses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  createdAt: trackChanges.createdAt,
});

const insertStatusSchema = createInsertSchema(statuses);
const updateStatusSchema = createUpdateSchema(statuses);

export type { Status };
export { statuses, insertStatusSchema, updateStatusSchema };
