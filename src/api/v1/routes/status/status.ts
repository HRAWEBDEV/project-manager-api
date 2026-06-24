import { Hono, type Handler } from "hono";
import { checkWorkspaceMember } from "../workspace/utils/checkWorkspaceMember";
import { db } from "../../../../db/v1/connect";
import { workspaces } from "../../../../db/v1/schemas/workspaces";
import {
  statuses,
  insertStatusSchema,
  updateStatusSchema,
} from "../../../../db/v1/schemas/statuses";
import { eq, and, inArray, exists } from "drizzle-orm";
import {
  type WithSessionVariables,
  USER,
} from "../auth/utils/contextSessionVaraibles";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";

const statusesRoutes = new Hono().basePath("/statuses");

const handleGetStatuses: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const workspace = c.req.query("workspace");
  const resultOrderBy = statuses.createdAt;
  const baseQuery = db
    .select({
      id: statuses.id,
      title: statuses.title,
      createdAt: statuses.createdAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
    })
    .from(statuses)
    .innerJoin(workspaces, eq(workspaces.id, statuses.workspaceId));
  if (workspace) {
    const workspaceIdSubQuery = db
      .select({ workspaceId: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.name, workspace));
    const result = await baseQuery
      .where(inArray(statuses.workspaceId, workspaceIdSubQuery))
      .orderBy(resultOrderBy);
    return c.json({ data: result });
  } else {
    const result = await baseQuery.orderBy(resultOrderBy);
    return c.json({ data: result });
  }
};
statusesRoutes.get("/", handleGetStatuses);

const handleCreateStatus: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { workspaceId, title } = (await c.req.json()) as {
    workspaceId: string;
    title: string;
  };
  insertStatusSchema
    .pick({
      workspaceId: true,
      title: true,
    })
    .parse({
      workspaceId,
      title,
    });
  const isMember = await checkWorkspaceMember(workspaceId, user.id);
  if (isMember.length === 0) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.FORBIDDEN,
        message: "You are not a member of this workspace",
      }),
    );
  }
  const result = await db
    .insert(statuses)
    .values({ workspaceId, title })
    .returning({
      id: statuses.id,
    });
  return c.json(result);
};
statusesRoutes.post("/", handleCreateStatus);

const handleUpdateStatus: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const id = c.req.param("id");
  const { title } = (await c.req.json()) as {
    title: string;
  };
  updateStatusSchema.pick({ title: true }).parse({ title });
  const [updatedStatus] = await db
    .update(statuses)
    .set({ title })
    .where(
      and(
        eq(statuses.id, id!),
        exists(checkWorkspaceMember(statuses.workspaceId, user.id)),
      ),
    )
    .returning({
      id: statuses.id,
    });
  if (!updatedStatus) throw new NotFoundError("Status not found");
  return c.json(updatedStatus);
};
statusesRoutes.patch("/:id", handleUpdateStatus);

export { statusesRoutes };
