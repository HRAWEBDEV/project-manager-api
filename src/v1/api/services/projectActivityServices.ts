import type { DBExecuter } from "../../db/connect";
import {
  type InsertProjectActivity,
  projectActivities,
} from "../../db/schemas/projectActivities";
import { eq, and } from "drizzle-orm";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { users } from "../../db/schemas/users";
import {
  type ActivityAction,
  generateUpdateProjectMeta,
  generateAddOrDeleteProjectMembersMeta,
} from "../utils/projectActivitiesMeta";

export class ProjectActivityService {
  constructor(private readonly db: DBExecuter) {}
  async getProjectActivities({
    filters,
  }: {
    filters: {
      projectId: string;
    };
  }) {
    const filterConditions = [
      eq(projectActivities.projectId, filters.projectId),
    ];
    const baseQuery = this.db
      .select({
        id: projectActivities.id,
        activityType: projectActivities.activityType,
        metadata: projectActivities.metadata,
        createdAt: projectActivities.createdAt,
        organizationMembersId: projectActivities.organizationMembersId,
        userId: users.id,
        username: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userAvatar: users.avatar,
      })
      .from(projectActivities)
      .innerJoin(
        organizationMembers,
        eq(projectActivities.organizationMembersId, organizationMembers.id),
      )
      .innerJoin(users, eq(organizationMembers.userId, users.id));
    const activities = await baseQuery
      .where(and(...filterConditions))
      .orderBy(projectActivities.createdAt);
    return activities;
  }
  async createProjectActivity({
    projectId,
    action,
    organizationMembersId,
  }: Pick<InsertProjectActivity, "projectId" | "organizationMembersId"> & {
    action: ActivityAction;
  }) {
    let meta = null;
    if (action.type === "updated") {
      meta = generateUpdateProjectMeta(action.meta);
      if (meta.length === 0) return undefined;
    }
    if (action.type === "member_added" || action.type === "member_removed") {
      meta = generateAddOrDeleteProjectMembersMeta(action.meta);
    }
    await this.db
      .insert(projectActivities)
      .values({
        activityType: action.type,
        projectId,
        organizationMembersId,
        metadata: meta,
      })
      .returning({ id: projectActivities.id });
    return {
      type: action.type,
      projectId: projectId,
      meta,
    };
  }
}
