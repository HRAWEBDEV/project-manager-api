import { type DBExecuter } from "../../db/connect";
import {
  type InsertWorkspaceMember,
  workspaceMembers,
} from "../../db/schemas/workspaceMembers";
import { eq, and } from "drizzle-orm";

class WorkspaceMembersService {
  constructor(private readonly db: DBExecuter) {}
  async createWorkspaceMember({
    organizationMemberId,
    workspaceId,
    role,
    addedBy,
  }: Pick<
    InsertWorkspaceMember,
    "organizationMemberId" | "workspaceId" | "role" | "addedBy"
  >) {
    const [createdWorkspaceMember] = await this.db
      .insert(workspaceMembers)
      .values({
        organizationMemberId,
        workspaceId,
        role,
        addedBy,
      })
      .returning({ id: workspaceMembers.id });
    return createdWorkspaceMember;
  }
  async getWorkspaceMember(workspaceId: string, organizationMemberId: string) {
    const [member] = await this.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.organizationMemberId, organizationMemberId),
        ),
      )
      .limit(1);
    return member || null;
  }
}

export { WorkspaceMembersService };
