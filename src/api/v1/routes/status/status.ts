import { Hono, type Handler } from "hono";
import { checkWorkspaceMember } from "../workspace/utils/checkWorkspaceMember";
import { checkWorkspaceOrganizationOwner } from "../workspace/utils/checkWorkspaceOrganizationOwner";
import { db } from "../../../../db/v1/connect";
import { workspaces } from "../../../../db/v1/schemas/workspaces";
import {
  statuses,
  insertStatusSchema,
  updateStatusSchema,
} from "../../../../db/v1/schemas/statuses";
import { eq, and, inArray, exists, or, isNull } from "drizzle-orm";
import {
  type WithSessionVariables,
  getUser,
} from "../auth/utils/contextSessionVariables";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { getHeaderWorkspaceID } from "../workspace/member/utils/headerWorkspaceCredentials";
import slugify from "slugify";
import z from "zod";

const statusesRoutes = new Hono().basePath("/statuses");

const handleGetStatuses: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const workspaceQuery = c.req.query("workspace");
  const { workspace } = z
    .object({
      workspace: z.string().min(1),
    })
    .parse({ workspace: workspaceQuery });
  const resultOrderBy = [statuses.createdAt, statuses.id];
  const baseQuery = db
    .select({
      id: statuses.id,
      title: statuses.title,
      key: statuses.key,
      createdAt: statuses.createdAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
    })
    .from(statuses)
    .leftJoin(workspaces, eq(workspaces.id, statuses.workspaceId));
  const workspaceIdSubQuery = db
    .select({ workspaceId: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.name, workspace))
    .limit(1);
  const result = await baseQuery
    .where(
      or(
        isNull(statuses.workspaceId),
        and(
          inArray(statuses.workspaceId, workspaceIdSubQuery),
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
  return c.json(result);
};
statusesRoutes.get(
  "/",
  checkUserPermission({
    rolePermission: "status:read",
    type: "workspace",
  }),
  handleGetStatuses,
);

const handleCreateStatus: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
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
        message: "Workspace ID is required",
      }),
    );
  }
  const parsedStatus = insertStatusSchema
    .pick({
      workspaceId: true,
      title: true,
    })
    .parse({
      workspaceId,
      title,
    });
  const key = slugify(title, { lower: true, strict: true, trim: true });
  const [createdStatus] = await db
    .insert(statuses)
    .values({ workspaceId, title, key })
    .returning({
      id: statuses.id,
    });
  return c.json(createdStatus);
};
statusesRoutes.post(
  "/",
  checkUserPermission({
    rolePermission: "status:create",
    type: "workspace",
  }),
  handleCreateStatus,
);

const handleUpdateStatus: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const id = c.req.param("id");
  const workspaceId = getHeaderWorkspaceID(c);
  const { title } = (await c.req.json()) as {
    title: string;
  };
  const key = slugify(title, { lower: true, strict: true, trim: true });
  const parsedStatus = updateStatusSchema
    .pick({ title: true })
    .parse({ title });
  const [updatedStatus] = await db
    .update(statuses)
    .set({ title: parsedStatus.title, key })
    .where(
      and(
        eq(statuses.id, Number(id!)),
        eq(statuses.workspaceId, workspaceId!),
        or(
          exists(checkWorkspaceMember(statuses.workspaceId, user.id)),
          exists(checkWorkspaceMember(statuses.workspaceId, workspaceId!)),
        ),
      ),
    )
    .returning({
      id: statuses.id,
    });
  if (!updatedStatus) throw new NotFoundError("Status not found");
  return c.json(updatedStatus);
};
statusesRoutes.patch(
  "/:id",
  checkUserPermission({
    rolePermission: "status:update",
    type: "workspace",
  }),
  handleUpdateStatus,
);

export { statusesRoutes };
