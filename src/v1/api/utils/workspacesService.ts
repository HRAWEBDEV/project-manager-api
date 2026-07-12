import { type DBExecuter } from "../../db/connect";
import { type InsertWorkspace, workspaces } from "../../db/schemas/workspaces";
import { workspaceMembers } from "../../db/schemas/workspaceMembers";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { eq, and, or, sql, isNotNull } from "drizzle-orm";
import { organizations } from "../../db/schemas/organizations";

class WorkspacesService {
  constructor(private readonly db: DBExecuter) {}
  async getWorkspaces({
    filters,
  }: {
    filters: {
      userId: string;
      organizationId?: string;
    };
  }) {
    const baseQuery = this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        description: workspaces.description,
        createdBy: workspaces.createdBy,
        organizationId: workspaces.organizationId,
        organizationName: organizations.name,
        organizationRole: organizationMembers.role,
        workspaceMemberRole: sql<string>`
          CASE
            WHEN ${organizationMembers.role} = ${"owner"}
              THEN ${"admin"}::text
            ELSE
              ${workspaceMembers.role}::text
          END
        `,
      })
      .from(workspaces)
      .leftJoin(organizations, eq(organizations.id, workspaces.organizationId))
      .leftJoin(
        organizationMembers,
        and(
          eq(organizationMembers.organizationId, workspaces.organizationId),
          eq(organizationMembers.userId, filters.userId),
        ),
      )
      .leftJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, workspaces.id),
          eq(workspaceMembers.organizationMemberId, organizationMembers.id),
        ),
      );
    const filterConditions = [
      or(
        isNotNull(workspaceMembers.organizationMemberId),
        eq(organizationMembers.role, "owner"),
      ),
    ];
    if (filters.organizationId) {
      filterConditions.push(
        eq(workspaces.organizationId, filters.organizationId),
      );
    }
    const workspacesResult = await baseQuery
      .where(and(...filterConditions))
      .orderBy(workspaces.createdAt);
    return workspacesResult;
  }

  async createWorkspace({
    name,
    organizationId,
    description,
    createdBy,
  }: Pick<
    InsertWorkspace,
    "name" | "organizationId" | "description" | "createdBy"
  >) {
    const slug = `${slugify(name, {
      trim: true,
      strict: true,
      lower: true,
    })}_${nanoid(8)}`;
    const [createdWorkspace] = await this.db
      .insert(workspaces)
      .values({
        name,
        slug,
        organizationId,
        description,
        createdBy,
      })
      .returning({ id: workspaces.id });
    return createdWorkspace;
  }
  async createPublicWorkspace({
    organizationId,
    createdBy,
  }: Pick<InsertWorkspace, "organizationId" | "createdBy">) {
    return this.createWorkspace({
      organizationId,
      createdBy,
      name: "public",
      description: "default public workspace",
    });
  }
}

export { WorkspacesService };
