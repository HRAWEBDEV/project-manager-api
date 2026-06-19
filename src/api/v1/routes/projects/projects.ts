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
import { eq, and, inArray, sql, exists } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";

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
  const userIdEq = eq(projectMembers.userId, user.id);
  const projectNotDeleted = eq(projects.deleted, false);
  const resultOrderBy = projects.createdAt;
  if (workspace) {
    const workspaceIdSubQuery = db
      .select({ workspaceId: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.name, workspace));
    const result = await baseQuery
      .where(
        and(
          userIdEq,
          projectNotDeleted,
          inArray(projects.workspaceId, workspaceIdSubQuery),
        ),
      )
      .orderBy(resultOrderBy);
    return c.json({ data: result });
  } else {
    const result = await baseQuery
      .where(and(userIdEq, projectNotDeleted))
      .orderBy(resultOrderBy);
    return c.json({ data: result });
  }
};
projectsRoutes.get("/", handleGetProjects);

const handleCreateProject: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { workspaceId, name, color, isArchived } = await c.req.json();
  insertProjectsSchema
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
  const [createProject] = await db.transaction(async (tx) => {
    const [createdProject] = await tx
      .insert(projects)
      .values({
        workspaceId,
        name,
        slug,
        color,
        isArchived,
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
      .returning({ id: projectMembers.id });
    if (!createdMember) throw new Error("Failed to create project member");
    return [createdProject];
  });
  return c.json({ data: createProject });
};
projectsRoutes.post("/", handleCreateProject);

function checkUserProjectMember(projectId: string, userId: string) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);
}

const handleUpdateProject: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const { name, color, isArchived } = await c.req.json();
  const id = c.req.param("id");
  updateProjectsSchema
    .pick({
      name: true,
      color: true,
      isArchived: true,
    })
    .parse({ name, color, isArchived });

  const [updatedProject] = await db
    .update(projects)
    .set({ name, color, isArchived })
    .where(
      and(
        eq(projects.id, id!),
        eq(projects.deleted, false),
        exists(checkUserProjectMember(id!, user.id)),
      ),
    )
    .returning({ id: projects.id });

  if (!updatedProject) throw new NotFoundError("Project not found");
  return c.json({ data: updatedProject });
};

projectsRoutes.patch("/:id", handleUpdateProject);

export { projectsRoutes };
