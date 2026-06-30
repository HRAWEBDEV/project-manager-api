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
  getUser,
} from "../auth/utils/contextSessionVariables";
import { eq, and, inArray, exists, isNotNull, or } from "drizzle-orm";
import { checkOrganizationOwner } from "../organization/utils/checkOrganizationOwner";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { NotFoundError } from "../../../../db/v1/utils/NotFound";
import { checkWorkspaceOrganizationOwner } from "../workspace/utils/checkWorkspaceOrganizationOwner";
import { checkProjectMember } from "./utils/checkProjectMember";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { getHeaderWorkspaceID } from "../workspace/member/utils/headerWorkspaceCredentials";

const projectsRoutes = new Hono().basePath("/projects");

const handleGetProjects: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
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
    .from(projects)
    .leftJoin(
      projectMembers,
      and(
        eq(projectMembers.projectId, projects.id),
        eq(projectMembers.userId, user.id),
      ),
    )
    .leftJoin(workspaces, eq(projects.workspaceId, workspaces.id));
  const filterProjectsConditions = [
    or(
      isNotNull(projectMembers.userId),
      exists(checkOrganizationOwner(workspaces.organizationId, user.id)),
    ),
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
projectsRoutes.get(
  "/",
  checkUserPermission({ type: "workspace", rolePermission: "project:read" }),
  handleGetProjects,
);

const handleCreateProject: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const { name, color, isArchived } = await c.req.json();
  const workspaceId = getHeaderWorkspaceID(c);
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
projectsRoutes.post(
  "/",
  checkUserPermission({ type: "workspace", rolePermission: "project:create" }),
  handleCreateProject,
);

const handleUpdateProject: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const { name, color, isArchived } = await c.req.json();
  const id = c.req.param("id");
  const workspaceId = getHeaderWorkspaceID(c);
  const parsedProject = updateProjectsSchema
    .pick({
      id: true,
      name: true,
      color: true,
      isArchived: true,
    })
    .parse({ name, color, isArchived, id });
  const slug = `${slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  })}-${nanoid(8)}`;
  const [updatedProject] = await db
    .update(projects)
    .set({
      name: parsedProject.name,
      color: parsedProject.color,
      isArchived: parsedProject.isArchived,
      slug,
    })
    .where(
      and(
        eq(projects.id, id!),
        eq(projects.workspaceId, workspaceId!),
        eq(projects.deleted, false),
        or(
          exists(checkProjectMember(id!, user.id)),
          exists(checkWorkspaceOrganizationOwner(workspaceId!, user.id)),
        ),
      ),
    )
    .returning({ id: projects.id });

  if (!updatedProject) throw new NotFoundError("Project not found");
  return c.json(updatedProject);
};
projectsRoutes.patch(
  "/:id",
  checkUserPermission({ type: "workspace", rolePermission: "project:update" }),
  handleUpdateProject,
);

export { projectsRoutes };
