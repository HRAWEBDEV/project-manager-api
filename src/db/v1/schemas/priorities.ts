import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

type Priority = typeof priorities.$inferSelect;

const priorities = pgTable("priorities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("name").notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
});

export type { Priority };
export { priorities };
