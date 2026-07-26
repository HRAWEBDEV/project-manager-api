import { type Handler, Hono } from "hono";
import {
  getContextUser,
  type WithSessionUserVariables,
} from "../../utils/sessionUserContext";
import { BoardsService } from "../../services/boardsServices";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { getHeaderActiveWorkspace } from "../../utils/userActiveWorkspace";
import {
  selectBoardSchema,
  insertBoardSchema,
} from "../../../db/schemas/boards";
import { db } from "../../../db/connect";
import { getContextUserOrganizationMember } from "../../utils/userActiveOrganization";

const boardsRoutes = new Hono().basePath("/boards");

const handleGetBoards: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const workspaceId = getHeaderActiveWorkspace(c);
  const projectId = c.req.query("project-id");
  const parsedQuery = selectBoardSchema
    .pick({
      projectId: true,
    })
    .parse({
      projectId,
    });
  const boardsService = new BoardsService(db);
  const boards = await boardsService.getBoards({
    filters: {
      projectId: parsedQuery.projectId,
      workspaceId: workspaceId!,
    },
  });
  return c.json({ boards });
};

boardsRoutes.get(
  "/",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "board:read",
  }),
  handleGetBoards,
);

const handleCreateBoard: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const organizationMember = getContextUserOrganizationMember(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const { name, projectId, color } = await c.req.json();
  const parsedNewBoard = insertBoardSchema
    .pick({
      name: true,
      color: true,
      projectId: true,
    })
    .parse({
      name,
      projectId,
      color,
    });
  const boardService = new BoardsService(db);
  const board = await boardService.createBoard({
    name: parsedNewBoard.name,
    color: parsedNewBoard.color,
    projectId: parsedNewBoard.projectId,
    createdBy: organizationMember.id,
  });
  return c.json(board);
};

boardsRoutes.post(
  "/",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "board:create",
  }),
  handleCreateBoard,
);

export { boardsRoutes };
