import type { DBExecuter } from "../../db/connect";
import {
  type InsertWorkspaceActivity,
  workspaceActivities,
} from "../../db/schemas/workspaceActivities";
import { eq, and } from "drizzle-orm";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { users } from "../../db/schemas/users";
import {
  type UpdateWorkspaceMeta,
  type AddOrDeleteWorkspaceMembersMeta,
  generateAddOrDeleteWorkspaceMembersMeta,
  generateUpdateWorkspaceMeta,
} from "../utils/workspaceActivitiesMeta";

type ActivityAction =
  | {
      type: "created";
    }
  | {
      type: "updated";
      meta: UpdateWorkspaceMeta;
    }
  | {
      type: "deleted";
    }
  | {
      type: "member_added" | "member_removed";
      meta: AddOrDeleteWorkspaceMembersMeta;
    };

export class WorkspaceActivityService {
  constructor(private readonly db: DBExecuter) {}
  async getWorkspaceActivities({
    filters,
  }: {
    filters: {
      workspaceId: string;
    };
  }) {
    const filterConditions = [
      eq(workspaceActivities.workspaceId, filters.workspaceId),
    ];
    const baseQuery = this.db
      .select()
      .from(workspaceActivities)
      .innerJoin(
        organizationMembers,
        eq(workspaceActivities.organizationMembersId, organizationMembers.id),
      )
      .innerJoin(users, eq(organizationMembers.userId, users.id));
    const activities = await baseQuery
      .where(and(...filterConditions))
      .orderBy(workspaceActivities.createdAt);
    return activities;
  }
  async createWorkspaceActivity({
    workspaceId,
    action,
    organizationMembersId,
  }: Pick<InsertWorkspaceActivity, "workspaceId" | "organizationMembersId"> & {
    action: ActivityAction;
  }) {
    let meta = null;
    if (action.type === "updated") {
      meta = generateUpdateWorkspaceMeta(action.meta);
    }
    if (action.type === "member_added" || action.type === "member_removed") {
      meta = generateAddOrDeleteWorkspaceMembersMeta(action.meta);
    }
    const [createdActivity] = await this.db
      .insert(workspaceActivities)
      .values({
        activityType: action.type,
        workspaceId,
        organizationMembersId,
        metadata: meta,
      })
      .returning({ id: workspaceActivities.id });
    return createdActivity;
  }
}
