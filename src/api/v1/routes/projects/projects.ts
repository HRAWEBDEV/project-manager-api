import { Hono, type Handler } from "hono";
import { projectMembers } from "../../../../db/v1/schemas/projectMember";
import {
  projects,
  insertProjectsSchema,
  updateProjectsSchema,
} from "../../../../db/v1/schemas/projects";
import { workspaces } from "../../../../db/v1/schemas/workspaces";
import { db } from "../../../../db/v1/connect";
import {
  type WithSessionVariables,
  USER,
} from "../auth/utils/contextSessionVaraibles";
import { eq, and, inArray, exists } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";
import { checkProjectMember } from "./utils/checkProjectMember";
import { checkWorkspaceMember } from "../workspace/utils/checkWorkspaceMember";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";

const projectsRoutes = new Hono().basePath("/projects");

const handleGetProjects: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const workspace = c.req.query("workspace");
  const baseQuery = db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      color: projects.color,
      isArchived: projects.isArchived,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id));
  const filterProjectsConditions = [
    eq(projectMembers.userId, user.id),
    eq(projects.deleted, false),
  ];
  const resultOrderBy = projects.createdAt;
  if (workspace) {
    const workspaceIdSubQuery = db
      .select({ workspaceId: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.name, workspace));
    filterProjectsConditions.push(
      inArray(projects.workspaceId, workspaceIdSubQuery),
    );
  }
  const result = await baseQuery
    .where(and(...filterProjectsConditions))
    .orderBy(resultOrderBy);
  return c.json({ projects: result });
};
projectsRoutes.get("/", handleGetProjects);

const handleCreateProject: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { workspaceId, name, color, isArchived } = await c.req.json();
  const parsedProject = insertProjectsSchema
    .pick({
      workspaceId: true,
      name: true,
      color: true,
      isArchived: true,
    })
    .parse({
      workspaceId,
      name,
      color,
      isArchived,
    });
  const slug = `${slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  })}-${nanoid(8)}`;
  const isMember = await checkWorkspaceMember(
    parsedProject.workspaceId,
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
  const [createdProject] = await db.transaction(async (tx) => {
    const [createdProject] = await tx
      .insert(projects)
      .values({
        workspaceId: parsedProject.workspaceId,
        name: parsedProject.name,
        slug,
        color: parsedProject.color,
        isArchived: parsedProject.isArchived,
        createdBy: user.id,
      })
      .returning({ id: projects.id });
    if (!createdProject) throw new Error("Failed to create project");
    const [createdMember] = await tx
      .insert(projectMembers)
      .values({
        projectId: createdProject.id,
        userId: user.id,
      })
      .returning({
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
      });
    if (!createdMember) throw new Error("Failed to create project member");
    return [createdProject];
  });
  return c.json(createdProject);
};
projectsRoutes.post("/", handleCreateProject);

const handleUpdateProject: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { name, color, isArchived } = await c.req.json();
  const id = c.req.param("id");
  const parsedProject = updateProjectsSchema
    .pick({
      id: true,
      name: true,
      color: true,
      isArchived: true,
    })
    .parse({ name, color, isArchived, id });

  const [updatedProject] = await db
    .update(projects)
    .set({
      name: parsedProject.name,
      color: parsedProject.color,
      isArchived: parsedProject.isArchived,
    })
    .where(
      and(
        eq(projects.id, id!),
        eq(projects.deleted, false),
        exists(checkProjectMember(id!, user.id)),
      ),
    )
    .returning({ id: projects.id });

  if (!updatedProject) throw new NotFoundError("Project not found");
  return c.json(updatedProject);
};
projectsRoutes.patch("/:id", handleUpdateProject);

export { projectsRoutes };
