import { pgTable, uuid, varchar, integer, unique } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { trackChanges } from "../utils/trackChanges";
import { organizationMembers } from "./organizationMembers";

type Board = typeof boards.$inferSelect;
type InsertBoard = typeof boards.$inferInsert;

const boards = pgTable(
  "boards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    name: varchar("name", { length: 100 }).notNull(),
    position: integer("position").notNull(),
    color: varchar("color", { length: 20 }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => organizationMembers.id),
    ...trackChanges,
  },
  (table) => [
    unique("boards_unique_name_projectId").on(table.projectId, table.name),
    unique("boards_unique_position_projectId").on(
      table.position,
      table.projectId,
    ),
  ],
);

export type { Board, InsertBoard };
export { boards };
