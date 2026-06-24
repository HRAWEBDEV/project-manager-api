import { Hono, type Handler } from "hono";
import { checkWorkspaceMember } from "../workspace/utils/checkWorkspaceMember";
import { db } from "../../../../db/v1/connect";
import { workspaces } from "../../../../db/v1/schemas/workspaces";
import { eq, and, inArray, exists } from "drizzle-orm";
import {
  priorities,
  insertPrioritySchema,
  updatePrioritySchema,
} from "../../../../db/v1/schemas/priorities";
import {
  type WithSessionVariables,
  USER,
} from "../auth/utils/contextSessionVaraibles";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";

const prioritiesRoutes = new Hono().basePath("/priorities");

const handleGetPriorities: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const workspace = c.req.query("workspace");
  const resultOrderBy = priorities.createdAt;
  const baseQuery = db
    .select({
      id: priorities.id,
      title: priorities.title,
      createdAt: priorities.createdAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
    })
    .from(priorities)
    .innerJoin(workspaces, eq(workspaces.id, priorities.workspaceId));
  if (workspace) {
    const workspaceIdSubQuery = db
      .select({ workspaceId: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.name, workspace));
    const result = await baseQuery
      .where(inArray(priorities.workspaceId, workspaceIdSubQuery))
      .orderBy(resultOrderBy);
    return c.json({ data: result });
  } else {
    const result = await baseQuery.orderBy(resultOrderBy);
    return c.json(result);
  }
};
prioritiesRoutes.get("/", handleGetPriorities);

const handleCreatePrioriy: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { workspaceId, title } = (await c.req.json()) as {
    workspaceId: string;
    title: string;
  };
  insertPrioritySchema
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
  const [createdPrioriy] = await db
    .insert(priorities)
    .values({ workspaceId, title })
    .returning({
      id: priorities.id,
    });
  return c.json(createdPrioriy);
};
prioritiesRoutes.post("/", handleCreatePrioriy);

const handleUpdatePriority: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const id = c.req.param("id");
  const { title } = (await c.req.json()) as {
    title: string;
  };
  updatePrioritySchema.pick({ title: true }).parse({ title });
  const [updatedPriority] = await db
    .update(priorities)
    .set({ title })
    .where(
      and(
        eq(priorities.id, id!),
        exists(checkWorkspaceMember(priorities.workspaceId, user.id)),
      ),
    )
    .returning({
      id: priorities.id,
    });
  if (!updatedPriority) throw new NotFoundError("priority not found");
  return c.json(updatedPriority);
};
prioritiesRoutes.patch("/:id", handleUpdatePriority);

export { prioritiesRoutes };
