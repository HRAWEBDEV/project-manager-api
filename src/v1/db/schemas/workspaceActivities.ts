import { pgTable, pgEnum, jsonb, uuid } from "drizzle-orm/pg-core";
import { organizationMembers } from "./organizationMembers";
import { trackChanges } from "../utils/trackChanges";

const workspaceActivityType = pgEnum("workspace_activity_type", [
  "created",
  "updated",
  "deleted",
  "member_added",
  "member_removed",
]);

type WorkspaceActivity = typeof workspaceActivities.$inferSelect;
type InsertWorkspaceActivity = typeof workspaceActivities.$inferInsert;

const workspaceActivities = pgTable("workspace_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  organizationMembersId: uuid("organization_members_id")
    .notNull()
    .references(() => organizationMembers.id, {
      onDelete: "cascade",
    }),
  activityType: workspaceActivityType("activity_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: trackChanges.createdAt,
});

export type { WorkspaceActivity, InsertWorkspaceActivity };
export { workspaceActivities, workspaceActivityType };
