import { Hono, type Handler } from "hono";
import { projects } from "../../../../db/v1/schemas/projects";
import { projectMembers } from "../../../../db/v1/schemas/projectMember";
import { checkProjectMember } from "../projects/utils/checkProjectMember";
import {
  boards,
  insertBoardSchema,
  updateBoardSchema,
} from "../../../../db/v1/schemas/boards";
import { db } from "../../../../db/v1/connect";
import { eq, and, inArray, exists } from "drizzle-orm";
import {
  type WithSessionVariables,
  USER,
} from "../auth/utils/contextSessionVaraibles";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";
import { checkBoardMember } from "./utils/checkBoardMember";

const boardsRoutes = new Hono().basePath("/boards");

const handleGetBoards: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const project = c.req.query("project");
  z.object({
    project: z.string(),
  }).parse({
    project,
  });
  const userProjectSubQuery = db
    .select({
      id: projects.id,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(
      and(
        eq(projects.deleted, false),
        eq(projects.slug, project!),
        eq(projectMembers.userId, user.id),
      ),
    );
  const res = await db
    .select({
      id: boards.id,
      name: boards.name,
      position: boards.position,
      projectId: boards.projectId,
      projectName: projects.name,
    })
    .from(boards)
    .innerJoin(projects, eq(projects.id, boards.projectId))
    .where(
      and(eq(boards.deleted, false), inArray(projects.id, userProjectSubQuery)),
    )
    .orderBy(boards.createdAt);
  return c.json({
    data: res,
  });
};

boardsRoutes.get("/", handleGetBoards);

const handleCreateBoard: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { projectId, name, position } = (await c.req.json()) as {
    projectId: string;
    name: string;
    position: number;
  };
  insertBoardSchema
    .pick({
      projectId: true,
      name: true,
      position: true,
    })
    .parse({
      projectId,
      name,
      position,
    });
  const isMember = await checkProjectMember(projectId, user.id);
  if (isMember.length === 0) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.FORBIDDEN,
        message: "You are not a member of this project",
      }),
    );
  }
  const res = await db
    .insert(boards)
    .values({
      projectId,
      name,
      position,
    })
    .returning({
      id: boards.id,
    });
  return c.json({
    data: res,
  });
};

boardsRoutes.post("/", handleCreateBoard);

const handleUpdateBoard: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const id = c.req.param("id");
  const { name, position } = (await c.req.json()) as {
    name: string;
    position: number;
  };
  updateBoardSchema
    .pick({
      id: true,
      name: true,
      position: true,
    })
    .parse({
      id,
      name,
      position,
    });

  const [updatedBoard] = await db
    .update(boards)
    .set({ name, position })
    .where(
      and(
        eq(boards.id, id!),
        eq(boards.deleted, false),
        exists(checkBoardMember(id!, user.id)),
      ),
    )
    .returning({ id: projects.id });

  if (!updatedBoard) throw new NotFoundError("Project not found");
  return c.json({
    data: updatedBoard,
  });
};

boardsRoutes.patch("/:id", handleUpdateBoard);

export { boardsRoutes };
