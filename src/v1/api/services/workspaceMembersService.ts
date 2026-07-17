import { type DBExecuter } from "../../db/connect";
import {
  type InsertWorkspaceMember,
  workspaceMembers,
} from "../../db/schemas/workspaceMembers";
import { eq, and, sql } from "drizzle-orm";
import { workspaces } from "../../db/schemas/workspaces";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { users } from "../../db/schemas/users";
import { organizations } from "../../db/schemas/organizations";

class WorkspaceMembersService {
  constructor(private readonly db: DBExecuter) {}
  async getWorkspaceMembers({
    filters,
  }: {
    filters: {
      workspaceId: string;
    };
  }) {
    const members = await this.db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaces.id,
        organizationMemberId: organizationMembers.id,
        role: sql<string>`
          CASE
            WHEN ${organizationMembers.role} = ${"owner"}
              THEN ${"admin"}::text
            ELSE
              ${workspaceMembers.role}::text
          END
        `,
        joinedAt: workspaceMembers.joinedAt,
        addedBy: workspaceMembers.addedBy,
        workspaceName: workspaces.name,
        userId: users.id,
        username: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userPhoneNumber: users.phoneNumber,
        organizationId: organizations.id,
        organizationName: organizations.name,
      })
      .from(workspaceMembers)
      .leftJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .leftJoin(
        organizationMembers,
        eq(workspaceMembers.organizationMemberId, organizationMembers.id),
      )
      .leftJoin(organizations, eq(organizations.id, workspaces.organizationId))
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, filters.workspaceId))
      .orderBy(workspaceMembers.joinedAt);
    return members;
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
    return member;
  }

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

  async deleteWorkspaceMember(workspaceId: string, id: string) {
    const [deletedMember] = await this.db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.id, id),
        ),
      )
      .returning({
        id: workspaceMembers.id,
      });
    return deletedMember;
  }
}

export { WorkspaceMembersService };
