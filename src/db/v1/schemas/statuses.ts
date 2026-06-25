import { pgTable, uuid, serial, varchar } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { trackChanges } from "../utils/trackChanges";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

type Status = typeof statuses.$inferSelect;

const statuses = pgTable("statuses", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull().unique(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  createdAt: trackChanges.createdAt,
});

const insertStatusSchema = createInsertSchema(statuses);
const updateStatusSchema = createUpdateSchema(statuses);

const systemStatuses = [
  {
    key: "TODO",
    title: "todo",
  },
  {
    key: "IN_PROGRESS",
    title: "in progress",
  },
  {
    key: "DONE",
    title: "done",
  },
];

export type { Status };
export { statuses, insertStatusSchema, updateStatusSchema, systemStatuses };
