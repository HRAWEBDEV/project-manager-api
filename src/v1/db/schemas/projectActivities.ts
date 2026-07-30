import { pgTable, pgEnum, jsonb, uuid } from "drizzle-orm/pg-core";
import { organizationMembers } from "./organizationMembers";
import { projects } from "./projects";
import { trackChanges } from "../utils/trackChanges";

const projectActivityType = pgEnum("project_activity_type", [
  "created",
  "updated",
  "deleted",
]);

type ProjectActivity = typeof projectActivities.$inferSelect;
type InsertProjectActivity = typeof projectActivities.$inferInsert;

const projectActivities = pgTable("task_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, {
      onDelete: "cascade",
    }),
  organizationMembersId: uuid("organization_members_id")
    .notNull()
    .references(() => organizationMembers.id, {
      onDelete: "cascade",
    }),
  activityType: projectActivityType("activity_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: trackChanges.createdAt,
});

export type { ProjectActivity, InsertProjectActivity };
export { projectActivities, projectActivityType };
