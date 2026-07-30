import type { DBExecuter } from "../../db/connect";
import {
  type InsertProjectActivity,
  projectActivities,
} from "../../db/schemas/projectActivities";
import { eq, and } from "drizzle-orm";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { users } from "../../db/schemas/users";
import {
  type UpdateProjectMeta,
  generateUpdateProjectMeta,
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
  async updateProjectActivityMeta({
    projectId,
    organizationMembersId,
    ...rest
  }: UpdateProjectMeta & {
    projectId: string;
    organizationMembersId: string;
  }) {
    const [createdActivity] = await this.db
      .insert(projectActivities)
      .values({
        activityType: "updated",
        projectId,
        organizationMembersId,
        metadata: generateUpdateProjectMeta(rest),
      })
      .returning({ id: projectActivities.id });
    return createdActivity;
  }
  async deleteProjectActivity({
    projectId,
    organizationMembersId,
  }: {
    projectId: string;
    organizationMembersId: string;
  }) {
    const [createdActivity] = await this.db
      .insert(projectActivities)
      .values({
        activityType: "deleted",
        projectId,
        organizationMembersId,
      })
      .returning({ id: projectActivities.id });
    return createdActivity;
  }
}
