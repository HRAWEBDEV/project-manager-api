import { Hono, type Handler } from "hono";
import {
  USER,
  type WithSessionVariables,
} from "../auth/utils/contextSessionVariables";
import { workspaceMembers } from "../../../../db/v1/schemas/workspaceMembers";
import { db } from "../../../../db/v1/connect";
import {
  workspaces,
  insertWorkspaceSchema,
  updateWorkspaceSchema,
} from "../../../../db/v1/schemas/workspaces";
import { eq, and, exists } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";
import { checkWorkspaceMember } from "./utils/checkWorkspaceMember";
import { checkOrganizationMember } from "../organization/utils/checkOrganizationMember";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";
import { StatusCodes } from "http-status-codes";

const workspacesRoutes = new Hono().basePath("/workspaces");
const organizationIdQueryName = "organization-id";

const handleGetWorkspaces: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const organizationId = c.req.query(organizationIdQueryName);
  const baseQuery = db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      isPrivate: workspaces.isPrivate,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id));
  const filterWorkspacesConditions = [
    eq(workspaceMembers.userId, user.id),
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
workspacesRoutes.get("/", handleGetWorkspaces);

const handleCreateWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { organizationId, name, isPrivate } = await c.req.json();
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
  const isMember = await checkOrganizationMember(
    parsedWorkspace.organizationId,
    user.id,
  );
  if (isMember.length === 0) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.FORBIDDEN,
        message: "You are not a member of this organization",
      }),
    );
  }
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
workspacesRoutes.post("/", handleCreateWorkspace);

const handleUpdateWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { name, isPrivate } = await c.req.json();
  const id = c.req.param("id");
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
    })
    .where(
      and(
        eq(workspaces.id, id!),
        eq(workspaces.deleted, false),
        exists(checkWorkspaceMember(id!, user.id)),
      ),
    )
    .returning({
      id: workspaces.id,
    });
  if (!updatedWorkspace) throw new NotFoundError("Workspace not found");
  return c.json(updatedWorkspace);
};
workspacesRoutes.patch("/:id", handleUpdateWorkspace);

export { workspacesRoutes };
