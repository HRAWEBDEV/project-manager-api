import { type DBExecuter } from "../../db/connect";
import {
  type InsertOrganization,
  organizations,
} from "../../db/schemas/organizations";
import slugify from "slugify";
import { nanoid } from "nanoid";

class OrganizationsService {
  constructor(private readonly db: DBExecuter) {}
  async createOrganization({
    name,
    logo,
  }: Pick<InsertOrganization, "name" | "logo">) {
    const slug = `${slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    })}_${nanoid()}`;
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
}

export { OrganizationsService };
