import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const lists = pgTable("lists", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  ...trackChanges,
});

export { lists };
