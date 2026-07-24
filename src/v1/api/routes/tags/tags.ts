import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { TagsService } from "../../services/tagsServices";
import { getHeaderActiveWorkspace } from "../../utils/userActiveWorkspace";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { db } from "../../../db/connect";
import { insertTagSchema } from "../../../db/schemas/tags";

const tagsRoutes = new Hono().basePath("/tags");

const handleGetTags: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const workspaceId = getHeaderActiveWorkspace(c);
  const tagsService = new TagsService(db);
  const tags = await tagsService.getTags({
    filters: {
      workspaceId: workspaceId!,
    },
  });
  return c.json({
    tags,
  });
};

tagsRoutes.get(
  "/",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "tag:read",
  }),
  handleGetTags,
);

const handleCreateTag: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const workspaceId = getHeaderActiveWorkspace(c);
  const { name, color } = await c.req.json();
  const tagsService = new TagsService(db);
  const parsedTag = insertTagSchema
    .pick({
      name: true,
      color: true,
    })
    .parse({ name, color });
  const createdTag = await tagsService.createTag({
    ...parsedTag,
    workspaceId: workspaceId!,
  });
  return c.json({ createdTag });
};

tagsRoutes.post(
  "/",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "tag:create",
  }),
  handleCreateTag,
);

export { tagsRoutes };
