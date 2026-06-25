import { Hono, type Handler } from "hono";
import { checkWorkspaceMember } from "../workspace/utils/checkWorkspaceMember";
import { db } from "../../../../db/v1/connect";
import { workspaces } from "../../../../db/v1/schemas/workspaces";
import { eq, and, inArray, exists, or, isNull } from "drizzle-orm";
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
import { z } from "zod";
import slugify from "slugify";

const prioritiesRoutes = new Hono().basePath("/priorities");

const handleGetPriorities: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const workspaceQuery = c.req.query("workspace");
  const { workspace } = z
    .object({
      workspace: z.string().min(1),
    })
    .parse({ workspace: workspaceQuery });
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
  const workspaceIdSubQuery = db
    .select({ workspaceId: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.name, workspace));
  const result = await baseQuery
    .where(
      or(
        inArray(priorities.workspaceId, workspaceIdSubQuery),
        isNull(priorities.workspaceId),
      ),
    )
    .orderBy(resultOrderBy);
  return c.json({ data: result });
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
  if (!workspaceId) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.BAD_REQUEST,
        message: "workspaceId is required",
      }),
    );
  }
  const parsedPriority = insertPrioritySchema
    .pick({
      workspaceId: true,
      title: true,
    })
    .parse({
      workspaceId,
      title,
    });
  const isMember = await checkWorkspaceMember(
    parsedPriority.workspaceId!,
    user.id,
  );
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
  const key = slugify(title, { lower: true, strict: true });
  const [createdPrioriy] = await db
    .insert(priorities)
    .values({
      workspaceId: parsedPriority.workspaceId,
      title: parsedPriority.title,
      key,
    })
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
  const parsedPriority = updatePrioritySchema
    .pick({ title: true })
    .parse({ title });
  const [updatedPriority] = await db
    .update(priorities)
    .set({ title: parsedPriority.title })
    .where(
      and(
        eq(priorities.id, Number(id!)),
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
