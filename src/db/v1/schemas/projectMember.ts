import { pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

type ProjectMembers = typeof projectMembers.$inferInsert;

const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("projectId_userId_unique").on(table.projectId, table.userId),
  ],
);

export type { ProjectMembers };
export { projectMembers };
