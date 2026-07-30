import { pgTable, pgEnum, jsonb, uuid } from "drizzle-orm/pg-core";
import { organizationMembers } from "./organizationMembers";
import { trackChanges } from "../utils/trackChanges";

const taskActivityType = pgEnum("task_activity_type", [
  "created",
  "updated",
  "deleted",
]);

type TaskActivity = typeof taskActivities.$inferSelect;
type InsertTaskActivity = typeof taskActivities.$inferInsert;

const taskActivities = pgTable("task_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  organizationMembersId: uuid("organization_members_id")
    .notNull()
    .references(() => organizationMembers.id, {
      onDelete: "cascade",
    }),
  activityType: taskActivityType("activity_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: trackChanges.createdAt,
});

export type { TaskActivity, InsertTaskActivity };
export { taskActivities, taskActivityType };
