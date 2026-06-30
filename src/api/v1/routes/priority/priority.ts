import { Hono, type Handler } from "hono";
import { checkWorkspaceMember } from "../workspace/utils/checkWorkspaceMember";
import { db } from "../../../../db/v1/connect";
import { workspaces } from "../../../../db/v1/schemas/workspaces";
import { eq, and, inArray, exists, or, isNull } from "drizzle-orm";
import { getHeaderWorkspaceID } from "../workspace/member/utils/headerWorkspaceCredentials";
import {
  priorities,
  insertPrioritySchema,
  updatePrioritySchema,
} from "../../../../db/v1/schemas/priorities";
import {
  type WithSessionVariables,
  getUser,
} from "../auth/utils/contextSessionVariables";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";
import { checkWorkspaceOrganizationOwner } from "../workspace/utils/checkWorkspaceOrganizationOwner";
import { z } from "zod";
import slugify from "slugify";
import { checkUserPermission } from "../../middlewares/checkUserPermission";

const prioritiesRoutes = new Hono().basePath("/priorities");

const handleGetPriorities: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const workspaceQuery = c.req.query("workspace");
  const { workspace } = z
    .object({
      workspace: z.string().min(1),
    })
    .parse({ workspace: workspaceQuery });
  const resultOrderBy = [priorities.createdAt, priorities.id];
  const baseQuery = db
    .select({
      id: priorities.id,
      title: priorities.title,
      key: priorities.key,
      createdAt: priorities.createdAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
    })
    .from(priorities)
    .leftJoin(workspaces, eq(workspaces.id, priorities.workspaceId));
  const workspaceIdSubQuery = db
    .select({ workspaceId: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, workspace))
    .limit(1);
  const result = await baseQuery
    .where(
      or(
        isNull(priorities.workspaceId),
        and(
          inArray(priorities.workspaceId, workspaceIdSubQuery),
          or(
            exists(
              checkWorkspaceMember(
                workspaceIdSubQuery as unknown as typeof workspaces.id,
                user.id,
              ),
            ),
            exists(
              checkWorkspaceOrganizationOwner(
                workspaceIdSubQuery as unknown as typeof workspaces.id,
                user.id,
              ),
            ),
          ),
        ),
      ),
    )
    .orderBy(...resultOrderBy);
  return c.json({ data: result });
};
prioritiesRoutes.get(
  "/",
  checkUserPermission({
    rolePermission: "priority:read",
    type: "workspace",
  }),
  handleGetPriorities,
);

const handleCreatePrioriy: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const { title } = (await c.req.json()) as {
    title: string;
  };
  const workspaceId = getHeaderWorkspaceID(c);
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
  const key = slugify(title, { lower: true, strict: true, trim: true });
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
prioritiesRoutes.post(
  "/",
  checkUserPermission({
    rolePermission: "priority:read",
    type: "workspace",
  }),
  handleCreatePrioriy,
);

const handleUpdatePriority: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const id = c.req.param("id");
  const workspaceId = getHeaderWorkspaceID(c);
  const { title } = (await c.req.json()) as {
    title: string;
  };
  const parsedPriority = updatePrioritySchema
    .pick({ title: true })
    .parse({ title });
  const key = slugify(title, { lower: true, strict: true, trim: true });
  const [updatedPriority] = await db
    .update(priorities)
    .set({ title: parsedPriority.title, key })
    .where(
      and(
        eq(priorities.id, Number(id!)),
        eq(priorities.workspaceId, workspaceId!),
        or(
          exists(checkWorkspaceMember(priorities.workspaceId, user.id)),
          exists(
            checkWorkspaceOrganizationOwner(priorities.workspaceId, user.id),
          ),
        ),
      ),
    )
    .returning({
      id: priorities.id,
    });
  if (!updatedPriority) throw new NotFoundError("priority not found");
  return c.json(updatedPriority);
};
prioritiesRoutes.patch(
  "/:id",
  checkUserPermission({
    rolePermission: "priority:update",
    type: "workspace",
  }),
  handleUpdatePriority,
);

export { prioritiesRoutes };
