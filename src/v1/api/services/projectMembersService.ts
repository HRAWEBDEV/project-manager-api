import type { DBExecuter } from "../../db/connect";
import {
  type InsertProjectMember,
  projectMembers,
} from "../../db/schemas/projectMembers";
import { projects } from "../../db/schemas/projects";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { users } from "../../db/schemas/users";
import { eq, and } from "drizzle-orm";

class ProjectMembersService {
  constructor(private readonly db: DBExecuter) {}
  async createMember({
    addedBy,
    organizationMemberId,
    projectId,
  }: Pick<
    InsertProjectMember,
    "addedBy" | "organizationMemberId" | "projectId"
  >) {
    const [createdProjectMember] = await this.db
      .insert(projectMembers)
      .values({ addedBy, organizationMemberId, projectId })
      .returning({ id: projectMembers.id });
    return createdProjectMember;
  }

  async getProjectMembers({
    filters,
  }: {
    filters: {
      projectId: string;
      workspaceId: string;
    };
  }) {
    const fitlersCondition = [
      eq(projectMembers.projectId, filters.projectId),
      eq(projects.workspaceId, filters.workspaceId),
    ];
    const projectMembersResult = await this.db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        projectName: projects.name,
        organizationMemberId: projectMembers.organizationMemberId,
        userId: organizationMembers.userId,
        username: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        joinedAt: projectMembers.joinedAt,
        addedBy: projectMembers.addedBy,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .innerJoin(
        organizationMembers,
        eq(projectMembers.organizationMemberId, organizationMembers.id),
      )
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(...fitlersCondition))
      .orderBy(projectMembers.joinedAt);
    return projectMembersResult;
  }

  async deleteProjectMember(id: string, projectId: string) {
    const [deletedProjectMember] = await this.db
      .delete(projectMembers)
      .where(
        and(eq(projectMembers.id, id), eq(projectMembers.projectId, projectId)),
      )
      .returning({ id: projectMembers.id });
    return deletedProjectMember;
  }
}

export { ProjectMembersService };
