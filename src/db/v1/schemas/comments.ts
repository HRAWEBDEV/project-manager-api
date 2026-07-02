import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { users } from "./users";
import { trackChanges } from "../utils/trackChanges";
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from "drizzle-zod";

type Comment = typeof comments.$inferSelect;

const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, {
      onDelete: "cascade",
    }),
  authorId: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  content: text("content").notNull(),
  ...trackChanges,
});

const selectCommentSchema = createSelectSchema(comments);
const insertCommentSchema = createInsertSchema(comments);
const updateCommentSchema = createUpdateSchema(comments);

export type { Comment };
export {
  comments,
  selectCommentSchema,
  insertCommentSchema,
  updateCommentSchema,
};
