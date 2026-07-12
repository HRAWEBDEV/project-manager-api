import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { getContextUser } from "../../utils/sessionUserContext";
import { WorkspacesService } from "../../utils/workspacesService";
import { db } from "../../../db/connect";

const workspacesRoutes = new Hono().basePath("/workspaces");

const handleGetWorkspaces: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const organizationId = c.req.query("organization-id");
  const user = getContextUser(c);
  const workspaceService = new WorkspacesService(db);
  const workspacesResult = await workspaceService.getWorkspaces({
    filters: {
      organizationId,
      userId: user.id,
    },
  });
  return c.json({ workspaces: workspacesResult });
};
workspacesRoutes.get("/", handleGetWorkspaces);

export { workspacesRoutes };
