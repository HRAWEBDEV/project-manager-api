import { Hono, type Handler } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { getContextUser } from "../../utils/sessionUserContext";
import { getContextUserOrganizationMember } from "../../utils/userActiveOrganization";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import {
  insertInvitationSchema,
  OrganizationInvitationsService,
} from "../../services/organizationInvitationsService";
import { db } from "../../../db/connect";
import { OrganizationMembersService } from "../../services/organizationMembersService";

const organizationsRoutes = new Hono().basePath("/organizations");

// invitations
const handleGetInvitations: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const organizationMember = getContextUserOrganizationMember(c);
  const organizationInvitationsService = new OrganizationInvitationsService(db);
  const invitations = await organizationInvitationsService.getUserInvitations({
    filters: {
      organizationId: organizationMember.organizationId,
    },
  });
  return c.json({ invitations });
};

organizationsRoutes.get(
  "/invitations",
  checkUserPermission({
    type: "organization",
    rolePermission: "organization_invitation:read",
  }),
  handleGetInvitations,
);

const handleInvite: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const organizationMember = getContextUserOrganizationMember(c);
  const organizationInvitationsService = new OrganizationInvitationsService(db);
  const { email } = await c.req.json();
  const parsedInvitation = insertInvitationSchema
    .pick({ email: true })
    .parse({ email });
  const createdInvitation = await organizationInvitationsService.sendInvitation(
    {
      userId: user.id,
      email: parsedInvitation.email,
      organizationId: organizationMember.organizationId,
    },
  );
  return c.json(createdInvitation);
};
organizationsRoutes.post(
  "/invitations",
  checkUserPermission({
    type: "organization",
    rolePermission: "organization_invitation:create",
  }),
  handleInvite,
);
// members
const handleGetOrganizationMembers: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const ogMember = getContextUserOrganizationMember(c);
  const organizationMembersService = new OrganizationMembersService(db);
  const members = await organizationMembersService.getOrganizationsMembers({
    filters: {
      organizationId: ogMember.organizationId,
    },
  });
  return c.json({ members });
};

organizationsRoutes.get(
  "/members",
  checkUserPermission({
    type: "organization",
    rolePermission: "organization_member:read",
  }),
  handleGetOrganizationMembers,
);

const handleDeleteOrganizationMember: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const id = c.req.param("id");
  const ogMember = getContextUserOrganizationMember(c);
  const organizationMembersService = new OrganizationMembersService(db);
  const deleteMember =
    await organizationMembersService.deleteOrganizationMember({
      organizationId: ogMember.organizationId,
      role: ogMember.role,
      id: id!,
    });
  return c.json(deleteMember);
};

organizationsRoutes.delete(
  "/members/:id",
  checkUserPermission({
    type: "organization",
    rolePermission: "organization_member:delete",
  }),
  handleDeleteOrganizationMember,
);

export { organizationsRoutes };
