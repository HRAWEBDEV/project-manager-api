import { type DBExecuter } from "../../db/connect";
import {
  type Organization,
  type InsertOrganization,
  organizations,
} from "../../db/schemas/organizations";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";

class OrganizationsService {
  constructor(private readonly db: DBExecuter) {}
  async getOrganizations({
    filters: { userId },
  }: {
    filters: {
      userId: string;
    };
  }) {
    const organizationsResult = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        logo: organizations.logo,
        slug: organizations.slug,
        description: organizations.description,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        userRole: organizationMembers.role,
      })
      .from(organizations)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.organizationId, organizations.id),
          eq(organizationMembers.userId, userId),
        ),
      )
      .where(and(eq(organizationMembers.userId, userId)))
      .orderBy(organizations.createdAt);
    return organizationsResult;
  }
  async createOrganization({
    name,
    logo,
  }: Pick<InsertOrganization, "name" | "logo">) {
    const slug = `${slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    })}_${nanoid(8)}`;
    const result = await this.db
      .insert(organizations)
      .values({
        name,
        slug,
        logo,
      })
      .returning({
        id: organizations.id,
      });
    return result[0];
  }

  async updateOrganization({
    id,
    name,
    logo,
  }: Pick<Organization, "id"> &
    Partial<Pick<InsertOrganization, "name" | "logo">>) {
    let slug: string | undefined = undefined;
    if (name) {
      slug = `${slugify(name, {
        lower: true,
        strict: true,
        trim: true,
      })}_${nanoid(8)}`;
    }
    const [updatedOrganization] = await this.db
      .update(organizations)
      .set({
        name,
        logo,
        slug,
      })
      .where(eq(organizations.id, id))
      .returning({
        id: organizations.id,
      });
    return updatedOrganization;
  }
}

export { OrganizationsService };
