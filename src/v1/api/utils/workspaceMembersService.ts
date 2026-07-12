import { type DBExecuter } from "../../db/connect";
import {
  type InsertWorkspaceMember,
  workspaceMembers,
} from "../../db/schemas/workspaceMembers";

class WorkspaceMembersService {
  constructor(private readonly db: DBExecuter) {}
  async createWorkspaceMember({
    organizationMemberId,
    workspaceId,
    role,
  }: Pick<
    InsertWorkspaceMember,
    "organizationMemberId" | "workspaceId" | "role"
  >) {
    const [createdWorkspaceMember] = await this.db
      .insert(workspaceMembers)
      .values({
        organizationMemberId,
        workspaceId,
        role,
      })
      .returning({ id: workspaceMembers.id });
    return createdWorkspaceMember;
  }
}

export { WorkspaceMembersService };
