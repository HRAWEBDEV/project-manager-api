import { Hono, type Handler } from "hono";
import {
  USER,
  type WithSessionVariables,
} from "../auth/utils/contextSessionVaraibles";
import { db } from "../../../../db/v1/connect";
import {
  workspaces,
  insertWorkspaceSchema,
  updateWorkspaceSchema,
} from "../../../../db/v1/schemas/workspaces";
import { eq, and } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";

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
      organizationId: workspaces.organizationId,
      createdAt: workspaces.createdAt,
    })
    .from(workspaces);
  const userWorkSpaceEq = eq(workspaces.userId, user.id);
  if (organizationId) {
    const result = await baseQuery.where(
      and(eq(workspaces.organizationId, organizationId), userWorkSpaceEq),
    );
    return c.json({
      data: result,
    });
  } else {
    const result = await baseQuery.where(userWorkSpaceEq);
    return c.json({
      data: result,
    });
  }
};
workspacesRoutes.get("/", handleGetWorkspaces);

const handleCreateWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { organizationId, name, isPrivate = false } = await c.req.json();
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
  const res = await db
    .insert(workspaces)
    .values({
      userId: user.id,
      name,
      organizationId,
      slug,
    })
    .returning({
      id: workspaces.id,
    });
  return c.json({
    data: res[0],
  });
};
workspacesRoutes.post("/", handleCreateWorkspace);

const handleUpdateWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { name, slug, isPrivate } = await c.req.json();
  const id = c.req.param("id");
  updateWorkspaceSchema
    .pick({
      organizationId: true,
      name: true,
      slug: true,
      isPrivate: true,
    })
    .parse({
      organizationId: id,
      name,
      slug,
      isPrivate,
    });
  const res = await db
    .update(workspaces)
    .set({
      name,
      slug,
      isPrivate,
    })
    .where(and(eq(workspaces.id, id!), eq(workspaces.userId, user.id)))
    .returning({
      id: workspaces.id,
    });
  return c.json({
    data: res[0],
  });
};
workspacesRoutes.patch("/:id", handleUpdateWorkspace);

const handleDeleteWorkspace: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const id = c.req.param("id");
  const res = await db
    .delete(workspaces)
    .where(and(eq(workspaces.id, id!), eq(workspaces.userId, user.id)))
    .returning({
      id: workspaces.id,
    });
  return c.json({
    data: res[0],
  });
};

workspacesRoutes.delete("/:id", handleDeleteWorkspace);

export { workspacesRoutes };
