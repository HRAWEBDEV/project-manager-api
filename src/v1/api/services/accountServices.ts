import type { DBExecuter } from "../../db/connect";
import { type InsertUser } from "../../db/schemas/users";
import { type InsertOrganization } from "../../db/schemas/organizations";
import { type InsertSession } from "../../db/schemas/sessions";
import { OrganizationMembersService } from "./organizationMembersService";
import { OrganizationsService } from "./organizationsService";
import { SessionsService } from "./sessionsService";
import { UsersService } from "./usersService";
import { WorkspaceMembersService } from "./workspaceMembersService";
import { WorkspacesService } from "./workspacesService";

class AccountServices {
  constructor(private readonly db: DBExecuter) {}
  async createAccount({
    user,
    organization,
    session,
  }: {
    user: Pick<
      InsertUser,
      "username" | "firstName" | "lastName" | "email" | "phoneNumber"
    > & {
      password: string;
    };
    organization: Pick<InsertOrganization, "name" | "description">;
    session: Pick<InsertSession, "deviceName" | "ipAddress" | "userAgent">;
  }) {
    const createdSession = await this.db.transaction(async (tx) => {
      const usersService = new UsersService(tx);
      const organizationsService = new OrganizationsService(tx);
      const organizationMembersService = new OrganizationMembersService(tx);
      const sessionsService = new SessionsService(tx);
      const workspacesService = new WorkspacesService(tx);
      const workspaceMembersService = new WorkspaceMembersService(tx);
      const createdUser = await usersService.createUser(user);
      const createdOrganization =
        await organizationsService.createOrganization(organization);
      const createOrganizationMember =
        await organizationMembersService.createMember({
          userId: createdUser!.id,
          organizationId: createdOrganization!.id,
          role: "owner",
        });
      const createdWorkspace = await workspacesService.createPublicWorkspace({
        createdBy: createdUser!.id,
        organizationId: createdOrganization!.id,
      });
      await workspaceMembersService.createWorkspaceMember({
        organizationMemberId: createOrganizationMember!.id,
        workspaceId: createdWorkspace!.id,
      });
      const createdSession = await sessionsService.createSession({
        userId: createdUser!.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      });
      return createdSession!;
    });
    return {
      message: "account created successfully",
      session: createdSession,
    };
  }
}

export { AccountServices };
