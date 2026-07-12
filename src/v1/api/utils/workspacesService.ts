import { type DBExecuter } from "../../db/connect";
import { type InsertWorkspace, workspaces } from "../../db/schemas/workspaces";
import slugify from "slugify";
import { nanoid } from "nanoid";

class WorkspacesService {
  constructor(private readonly db: DBExecuter) {}
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
