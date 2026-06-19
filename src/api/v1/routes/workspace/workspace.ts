import { Hono, type Handler } from "hono";
import {
  USER,
  type WithSessionVariables,
} from "../auth/utils/contextSessionVaraibles";
import { workspaceMembers } from "../../../../db/v1/schemas/workspace_members";
import { db } from "../../../../db/v1/connect";
import {
  workspaces,
  insertWorkspaceSchema,
  updateWorkspaceSchema,
} from "../../../../db/v1/schemas/workspaces";
import { eq, and, exists, sql } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";

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
  const userWorkspaceEq = eq(workspaceMembers.userId, user.id);
  const notDeleted = eq(workspaces.deleted, false);
  const resultOrderBy = workspaces.createdAt;
  if (organizationId) {
    const res = await baseQuery
      .where(
        and(
          eq(workspaces.organizationId, organizationId),
          userWorkspaceEq,
          notDeleted,
        ),
      )
      .orderBy(resultOrderBy);
    return c.json({ data: res });
  } else {
    const res = await baseQuery
      .where(and(userWorkspaceEq, notDeleted))
      .orderBy(resultOrderBy);
    return c.json({ data: res });
  }
};
workspacesRoutes.get("/", handleGetWorkspaces);

const handleCreateWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { organizationId, name, isPrivate } = await c.req.json();
  insertWorkspaceSchema
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
        name,
        organizationId,
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
      })
      .returning({
        id: workspaceMembers.id,
      });
    if (!createMember) throw new Error("Failed to create workspace member");
    return [createdWorkspace];
  });
  return c.json({
    data: createdWorkspace,
  });
};
workspacesRoutes.post("/", handleCreateWorkspace);

function checkUserWorkspaceMember(workspaceId: string, userId: string) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
}

const handleUpdateWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { name, isPrivate } = await c.req.json();
  const id = c.req.param("id");
  updateWorkspaceSchema
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
      name,
      isPrivate,
    })
    .where(
      and(
        eq(workspaces.id, id!),
        eq(workspaces.deleted, false),
        exists(checkUserWorkspaceMember(id!, user.id)),
      ),
    )
    .returning({
      id: workspaces.id,
    });
  if (!updatedWorkspace) throw new NotFoundError("Workspace not found");
  return c.json({
    data: updatedWorkspace,
  });
};
workspacesRoutes.patch("/:id", handleUpdateWorkspace);

// TODO check workspace projects
// const handleDeleteWorkspace: Handler<{
//   Variables: WithSessionVariables["Variables"];
// }> = async (c) => {
//   const user = c.get(USER);
//   const id = c.req.param("id");
//   const res = await db
//     .update(workspaces)
//     .set({ deleted: true })
//     .where(
//       and(
//         eq(workspaces.id, id!),
//         exists(checkUserWorkspaceMember(id!, user.id)),
//       ),
//     )
//     .returning({
//       id: workspaces.id,
//     });
//   return c.json({
//     data: res[0],
//   });
// };
// workspacesRoutes.delete("/:id", handleDeleteWorkspace);

export { workspacesRoutes };
