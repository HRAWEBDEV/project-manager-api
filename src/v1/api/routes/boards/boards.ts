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
  updateBoardSchema,
} from "../../../db/schemas/boards";
import { db } from "../../../db/connect";
import { getContextUserOrganizationMember } from "../../utils/userActiveOrganization";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";
import { ProjectsService } from "../../services/projectsService";

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
  const user = getContextUser(c);
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

  const projectService = new ProjectsService(db);
  const project = await projectService.getProject({
    filters: {
      projectId: projectId!,
      userId: user.id,
      workspaceId: workspaceId!,
    },
  });
  if (!project) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Task not found",
      }),
    );
  }

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

const handleUpdateBoard: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const boardId = c.req.param("id");
  const workspaceId = getHeaderActiveWorkspace(c);
  const { name, color, position } = await c.req.json();
  const parsedNewBoard = updateBoardSchema
    .pick({
      name: true,
      color: true,
      position: true,
    })
    .parse({
      name,
      position,
      color,
    });
  const boardService = new BoardsService(db);
  const updatedBoard = await boardService.updateBoard({
    id: boardId!,
    name: parsedNewBoard.name,
    color: parsedNewBoard.color,
    position: parsedNewBoard.position,
    workspaceId: workspaceId!,
  });
  return c.json(updatedBoard);
};

boardsRoutes.patch(
  "/:id",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "board:update",
  }),
  handleUpdateBoard,
);

const handleDeleteBoard: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const boardId = c.req.param("id");
  const workspaceId = getHeaderActiveWorkspace(c);
  const boardService = new BoardsService(db);
  const deleteBoard = await boardService.deleteBoard({
    boardId: boardId!,
    workspaceId: workspaceId!,
  });
  return c.json(deleteBoard);
};

boardsRoutes.delete(
  "/:id",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "board:delete",
  }),
  handleDeleteBoard,
);

export { boardsRoutes };
