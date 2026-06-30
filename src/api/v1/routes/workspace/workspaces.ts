import { Hono, type Handler } from "hono";
import {
  type WithSessionVariables,
  getUser,
} from "../auth/utils/contextSessionVariables";
import { workspaceMembers } from "../../../../db/v1/schemas/workspaceMembers";
import { organizations } from "../../../../db/v1/schemas/organizations";
import { db } from "../../../../db/v1/connect";
import {
  workspaces,
  insertWorkspaceSchema,
  updateWorkspaceSchema,
} from "../../../../db/v1/schemas/workspaces";
import { eq, and, exists, or, isNotNull } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";
import { checkWorkspaceMember } from "./utils/checkWorkspaceMember";
import { checkOrganizationOwner } from "../organization/utils/checkOrganizationOwner";
import { getHeaderOrganizationID } from "../organization/member/utils/headerOrgCredentials";
import { checkUserPermission } from "../../middlewares/checkUserPermission";

const workspacesRoutes = new Hono().basePath("/workspaces");
const organizationIdQueryName = "organization-id";

const handleGetWorkspaces: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const organizationId = c.req.query(organizationIdQueryName);
  const baseQuery = db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      organizationId: workspaces.organizationId,
      organizationName: organizations.name,
      role: workspaceMembers.role,
      slug: workspaces.slug,
      isPrivate: workspaces.isPrivate,
    })
    .from(workspaces)
    .leftJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .leftJoin(organizations, eq(organizations.id, workspaces.organizationId));
  const filterWorkspacesConditions = [
    or(
      isNotNull(workspaceMembers.userId),
      exists(checkOrganizationOwner(workspaces.organizationId, user.id)),
    ),
    eq(workspaces.deleted, false),
  ];
  const resultOrderBy = workspaces.createdAt;
  if (organizationId) {
    filterWorkspacesConditions.push(
      eq(workspaces.organizationId, organizationId),
    );
  }
  const res = await baseQuery
    .where(and(...filterWorkspacesConditions))
    .orderBy(resultOrderBy);
  return c.json({ workspaces: res });
};
workspacesRoutes.get(
  "/",
  checkUserPermission({
    type: "organization",
    rolePermission: "workspace:read",
  }),
  handleGetWorkspaces,
);

const handleCreateWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const { name, isPrivate } = await c.req.json();
  const organizationId = getHeaderOrganizationID(c);
  const parsedWorkspace = insertWorkspaceSchema
    .pick({
      organizationId: true,
      name: true,
      isPrivate: true,
    })
    .parse({
      organizationId,
      name,
      isPrivate,
    });
  const slug = `${slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  })}-${nanoid(8)}`;
  const [createdWorkspace] = await db.transaction(async (tx) => {
    const [createdWorkspace] = await tx
      .insert(workspaces)
      .values({
        name: parsedWorkspace.name,
        organizationId: parsedWorkspace.organizationId,
        slug,
      })
      .returning({
        id: workspaces.id,
      });
    if (!createdWorkspace) throw new Error("Failed to create workspace");
    const [createMember] = await tx
      .insert(workspaceMembers)
      .values({
        userId: user.id,
        workspaceId: createdWorkspace.id,
        role: "admin",
      })
      .returning({
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
      });
    if (!createMember) throw new Error("Failed to create workspace member");
    return [createdWorkspace];
  });
  return c.json(createdWorkspace);
};
workspacesRoutes.post(
  "/",
  checkUserPermission({
    type: "organization",
    rolePermission: "workspace:create",
  }),
  handleCreateWorkspace,
);

const handleUpdateWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const organizationId = getHeaderOrganizationID(c);
  const { name, isPrivate } = await c.req.json();
  const id = c.req.param("id");
  const slug = `${slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  })}-${nanoid(8)}`;
  const parsedWorkspace = updateWorkspaceSchema
    .pick({
      organizationId: true,
      name: true,
      isPrivate: true,
    })
    .parse({
      organizationId: id,
      name,
      isPrivate,
    });
  const [updatedWorkspace] = await db
    .update(workspaces)
    .set({
      name: parsedWorkspace.name,
      isPrivate: parsedWorkspace.isPrivate,
      slug,
    })
    .where(
      and(
        eq(workspaces.id, id!),
        eq(workspaces.organizationId, organizationId!),
        eq(workspaces.deleted, false),
        or(
          exists(checkWorkspaceMember(id!, user.id)),
          exists(checkOrganizationOwner(workspaces.organizationId, user.id)),
        ),
      ),
    )
    .returning({
      id: workspaces.id,
    });
  if (!updatedWorkspace) throw new NotFoundError("Workspace not found");
  return c.json(updatedWorkspace);
};
workspacesRoutes.patch(
  "/:id",
  checkUserPermission({
    type: "organization",
    rolePermission: "workspace:update",
  }),
  handleUpdateWorkspace,
);

export { workspacesRoutes };
