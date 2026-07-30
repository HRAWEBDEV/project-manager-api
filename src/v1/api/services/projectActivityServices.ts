import type { DBExecuter } from "../../db/connect";
import {
  type InsertProjectActivity,
  projectActivities,
} from "../../db/schemas/projectActivities";
import { eq, and } from "drizzle-orm";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { users } from "../../db/schemas/users";

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
      .select()
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
    organizationMembersId,
  }: Pick<InsertProjectActivity, "projectId" | "organizationMembersId">) {
    const [createdActivity] = await this.db
      .insert(projectActivities)
      .values({
        activityType: "created",
        projectId,
        organizationMembersId,
      })
      .returning({ id: projectActivities.id });
    return createdActivity;
  }
}
