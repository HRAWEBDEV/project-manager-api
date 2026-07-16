import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { getContextUser } from "../../utils/sessionUserContext";
import { UsersService } from "../../services/usersService";
import { db } from "../../../db/connect";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";
import {
  ImageTooLargeError,
  InvalidImageTypeError,
  saveUserAvatar,
  deleteUserAvatar,
} from "../../utils/userAvatarManager";
import {
  selectInvitationSchema,
  OrganizationInvitationsService,
} from "../../services/organizationInvitationsService";
import { OrganizationMembersService } from "../../services/organizationMembersService";
import { OrganizationsService } from "../../services/organizationsService";

const usersRoutes = new Hono().basePath("/users");

const handleGetUserInfo: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const usersService = new UsersService(db);
  const userInfo = await usersService.getUserInfo(user.id);
  return c.json(userInfo);
};
usersRoutes.get("/info", handleGetUserInfo);

const handleGetUserOrganizations: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const organizationsService = new OrganizationsService(db);
  const organizations = await organizationsService.getOrganizations({
    filters: {
      userId: user.id,
    },
  });
  return c.json({ organizations });
};
usersRoutes.get("/organizations", handleGetUserOrganizations);

const handleUpdateUserAvatar: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const parseBody = await c.req.parseBody();
  const image = parseBody.image;
  const user = getContextUser(c);
  const usersService = new UsersService(db);
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
  try {
    const avatarUrl = await saveUserAvatar(image);
    const updatedUser = await usersService.updateUser({
      id: user.id,
      avatar: avatarUrl,
    });
    if (user.avatar) {
      deleteUserAvatar(user.avatar);
    }
    return c.json({
      message: "Avatar updated successfully",
      avatarUrl: `${baseUrl}${avatarUrl}`,
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
usersRoutes.post("/avatar", handleUpdateUserAvatar);

const handleDeleteUserAvatar: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const usersService = new UsersService(db);
  if (user.avatar) {
    await deleteUserAvatar(user.avatar);
    await usersService.updateUser({
      id: user.id,
      avatar: null,
    });
  }
  return c.json({
    message: "Avatar deleted successfully",
  });
};
usersRoutes.delete("/avatar", handleDeleteUserAvatar);

const handleGetUserInvitations: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const organizationInvitationsService = new OrganizationInvitationsService(db);
  const invitations = await organizationInvitationsService.getUserInvitations({
    filters: {
      userId: user.id,
    },
  });
  return c.json({
    invitations,
  });
};

usersRoutes.get("/me/invitations", handleGetUserInvitations);

const handleUpdateUserInvitation: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const id = c.req.param("id");
  const { status } = await c.req.json();
  const parsedBody = selectInvitationSchema
    .pick({
      status: true,
    })
    .parse({ status });
  const updatedInvitation = await db.transaction(async (tx) => {
    const organizationInvitationsService = new OrganizationInvitationsService(
      tx,
    );
    const organizationMembersService = new OrganizationMembersService(tx);
    const updatedInvitation =
      await organizationInvitationsService.updateInvitationStatus({
        id: id!,
        userId: user.id,
        status: parsedBody.status,
      });
    if (updatedInvitation && updatedInvitation.status === "accepted") {
      await organizationMembersService.createMember({
        organizationId: updatedInvitation.organizationId,
        userId: user.id,
        addedBy: updatedInvitation.userId,
      });
    }
    return updatedInvitation;
  });
  return c.json(updatedInvitation);
};

usersRoutes.patch("/me/invitations/:id", handleUpdateUserInvitation);

export { usersRoutes };
