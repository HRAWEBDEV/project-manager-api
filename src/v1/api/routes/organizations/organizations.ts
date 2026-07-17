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
import { updateOrganizationSchema } from "../../../db/schemas/organizations";
import { OrganizationsService } from "../../services/organizationsService";
import { OrganizationMembersService } from "../../services/organizationMembersService";
import { selectOrganizationMemberSchema } from "../../../db/schemas/organizationMembers";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";
import { OrganizationLogoService } from "../../utils/organizatoinLogoService";
import {
  ImageTooLargeError,
  InvalidImageTypeError,
} from "../../utils/staticImagesService";

const organizationsRoutes = new Hono().basePath("/organizations");

const handleUpdateOrganization: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const organizationMember = getContextUserOrganizationMember(c);
  const { name } = await c.req.json();
  const parsedBody = updateOrganizationSchema
    .pick({ name: true })
    .parse({ name });
  const organizationService = new OrganizationsService(db);
  const updatedOrganization = await organizationService.updateOrganization({
    id: organizationMember.organizationId,
    name: parsedBody.name,
  });
  return c.json(updatedOrganization);
};

organizationsRoutes.patch(
  "/",
  checkUserPermission({
    type: "organization",
    rolePermission: "organization:update",
  }),
  handleUpdateOrganization,
);

const handleUpdateOrganizationLogo: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const parseBody = await c.req.parseBody();
  const image = parseBody.image;
  const organizationMember = getContextUserOrganizationMember(c);
  const organizationService = new OrganizationsService(db);
  if (!(image instanceof File)) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.BAD_REQUEST,
        message: "Image is not a file",
      }),
    );
  }
  const url = new URL(c.req.url);
  const baseUrl = url.origin;
  const organizationLogoService = new OrganizationLogoService();
  try {
    const logoUrl = await organizationLogoService.saveStaticImage(image);
    const updatedUser = await organizationService.updateOrganization({
      id: organizationMember.organizationId,
      logo: logoUrl,
    });
    return c.json({
      message: "Avatar updated successfully",
      avatarUrl: `${baseUrl}${logoUrl}`,
      userId: updatedUser ? updatedUser.id : null,
    });
  } catch (err) {
    if (
      err instanceof InvalidImageTypeError ||
      err instanceof ImageTooLargeError
    ) {
      c.status(StatusCodes.BAD_REQUEST);
      return c.json(
        getApiErrorShape({
          status: "failed",
          code: StatusCodes.BAD_REQUEST,
          message: err.message,
        }),
      );
    }
    throw err;
  }
};

organizationsRoutes.post(
  "/logo",
  checkUserPermission({
    type: "organization",
    rolePermission: "organization:update",
  }),
  handleUpdateOrganizationLogo,
);

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

const handleUpdateOrganizationMember: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const id = c.req.param("id");
  const { role } = await c.req.json();
  const parsedBody = selectOrganizationMemberSchema
    .pick({ role: true })
    .parse({ role });
  if (parsedBody.role === "owner") {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.BAD_REQUEST,
        message: "Can not set organization member role to owner",
      }),
    );
  }
  const ogMember = getContextUserOrganizationMember(c);
  const organizationMembersService = new OrganizationMembersService(db);
  const updatedMember =
    await organizationMembersService.updateOrganizationMemberRole({
      id: id!,
      organizationId: ogMember.organizationId,
      role: parsedBody.role,
      updatorRole: ogMember.role,
    });
  if (!updatedMember) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Organization member not found",
      }),
    );
  }
  return c.json(updatedMember);
};

organizationsRoutes.patch(
  "/members/:id",
  checkUserPermission({
    type: "organization",
    rolePermission: "organization_member:update",
  }),
  handleUpdateOrganizationMember,
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
  if (!deleteMember) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Organization member not found",
      }),
    );
  }
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
