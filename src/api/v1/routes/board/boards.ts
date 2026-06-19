import { Hono, type Handler } from "hono";
import { projects } from "../../../../db/v1/schemas/projects";
import { projectMembers } from "../../../../db/v1/schemas/projectMember";
import { boards } from "../../../../db/v1/schemas/boards";
import { db } from "../../../../db/v1/connect";
import { eq, and, inArray } from "drizzle-orm";
import {
  type WithSessionVariables,
  USER,
} from "../auth/utils/contextSessionVaraibles";
import { z } from "zod";

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
        eq(projects.name, project!),
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
    );
  return c.json({
    data: res,
  });
};

boardsRoutes.get("/", handleGetBoards);

export { boardsRoutes };
