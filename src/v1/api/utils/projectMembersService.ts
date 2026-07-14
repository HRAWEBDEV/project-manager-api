import type { DBExecuter } from "../../db/connect";
import {
  type InsertProjectMember,
  projectMembers,
} from "../../db/schemas/projectMembers";

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
}

export { ProjectMembersService };
