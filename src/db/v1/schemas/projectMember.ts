import { pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

type ProjectMembers = typeof projectMembers.$inferInsert;

const projectMembers = pgTable(
  "project_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid().references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid().references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("projectId_userId_unique").on(table.projectId, table.userId),
  ],
);

export type { ProjectMembers };
export { projectMembers };
