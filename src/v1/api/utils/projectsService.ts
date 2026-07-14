import { type DBExecuter } from "../../db/connect";
import {
  type InsertProject,
  type Project,
  projects,
} from "../../db/schemas/projects";
import { projectMembers } from "../../db/schemas/projectMembers";
import { workspaces } from "../../db/schemas/workspaces";
import { workspaceMembers } from "../../db/schemas/workspaceMembers";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { and, eq, or, isNotNull } from "drizzle-orm";

class ProjectsService {
  constructor(private readonly db: DBExecuter) {}
  async getProjects({
    filters,
  }: {
    filters: {
      userId: string;
      workspaceId: string;
    };
  }) {
    const baseQuery = this.db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        icon: projects.icon,
        color: projects.color,
        createdBy: projects.createdBy,
        archived: projects.archived,
        organizationId: projects.organizationId,
        workspaceId: projects.workspaceId,
      })
      .from(projects)
      .leftJoin(workspaces, and(eq(projects.workspaceId, workspaces.id)))
      .leftJoin(
        organizationMembers,
        and(
          eq(organizationMembers.userId, filters.userId),
          eq(organizationMembers.organizationId, projects.organizationId),
        ),
      )
      .leftJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.organizationMemberId, organizationMembers.id),
          eq(workspaceMembers.workspaceId, projects.workspaceId),
        ),
      )
      .leftJoin(
        projectMembers,
        and(
          eq(projectMembers.organizationMemberId, organizationMembers.id),
          eq(projectMembers.projectId, projects.id),
        ),
      );
    const filterConditions = [
      and(
        eq(projects.workspaceId, filters.workspaceId),
        or(
          eq(organizationMembers.role, "owner"),
          eq(workspaceMembers.role, "admin"),
          isNotNull(projectMembers.organizationMemberId),
        ),
      ),
    ];
    const projectsResult = await baseQuery
      .where(and(...filterConditions))
      .orderBy(projects.createdAt);
    return projectsResult;
  }
  async createProject({
    name,
    description,
    icon,
    organizationId,
    workspaceId,
    createdBy,
    color,
  }: Pick<
    InsertProject,
    | "name"
    | "description"
    | "icon"
    | "organizationId"
    | "workspaceId"
    | "createdBy"
    | "color"
  >) {
    const [createdProject] = await this.db
      .insert(projects)
      .values({
        name,
        description,
        icon,
        organizationId,
        workspaceId,
        createdBy,
        color,
      })
      .returning({
        id: projects.id,
      });
    return createdProject;
  }
  async updateProject({
    organizationId,
    workspaceId,
    name,
    description,
    color,
    icon,
    id,
  }: Pick<Project, "organizationId" | "workspaceId" | "id"> &
    Partial<Pick<InsertProject, "name" | "description" | "color" | "icon">>) {
    const [updatedProject] = await this.db
      .update(projects)
      .set({
        name,
        description,
        color,
        icon,
      })
      .where(
        and(
          eq(projects.organizationId, organizationId),
          eq(projects.workspaceId, workspaceId),
          eq(projects.id, id),
        ),
      )
      .returning({
        id: projects.id,
      });
    return updatedProject;
  }
}

export { ProjectsService };
