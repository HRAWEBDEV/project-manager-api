import { pgTable, text, uuid, integer } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";
import { projects } from "./projects";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";

type Board = typeof boards.$inferSelect;

const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => projects.id, {
      onDelete: "cascade",
    }),
  name: text("name").notNull().unique(),
  position: integer("position").notNull().default(0),
  ...trackChanges,
});

const selectBoardSchema = createSelectSchema(boards);
const insertBoardSchema = createInsertSchema(boards);
const updateBoardSchema = createUpdateSchema(boards);

export type { Board };
export { selectBoardSchema, boards, insertBoardSchema, updateBoardSchema };
