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
      projectId?: string;
    };
  }) {
    let baseQuery = this.db
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
      )
      .$dynamic();
    const filterConditions = [
      eq(projects.workspaceId, filters.workspaceId),
      or(
        eq(organizationMembers.role, "owner"),
        eq(workspaceMembers.role, "admin"),
        isNotNull(projectMembers.organizationMemberId),
      ),
    ];
    if (filters.projectId) {
      filterConditions.push(eq(projects.id, filters.projectId));
    }
    baseQuery = baseQuery
      .where(and(...filterConditions))
      .orderBy(projects.createdAt);
    if (filters.projectId) {
      baseQuery = baseQuery.limit(1);
    }
    const projectsResult = await baseQuery;
    return projectsResult;
  }
  async getProject(props: {
    filters: {
      projectId: string;
      userId: string;
      workspaceId: string;
    };
  }) {
    return (await this.getProjects(props))[0];
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
    archived,
  }: Pick<Project, "organizationId" | "workspaceId" | "id"> &
    Partial<
      Pick<
        InsertProject,
        "name" | "description" | "color" | "icon" | "archived"
      >
    >) {
    const [updatedProject] = await this.db
      .update(projects)
      .set({
        name,
        description,
        color,
        icon,
        archived,
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
  async deleteProject({
    organizationId,
    workspaceId,
    id,
  }: Pick<Project, "organizationId" | "workspaceId" | "id">) {
    const [deletedProject] = await this.db
      .delete(projects)
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
    return deletedProject;
  }
}

export { ProjectsService };
