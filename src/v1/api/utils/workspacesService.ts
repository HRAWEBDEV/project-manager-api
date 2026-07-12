import { type DBExecuter } from "../../db/connect";
import { type InsertWorkspace, workspaces } from "../../db/schemas/workspaces";

class WorkspacesService {
  constructor(private readonly db: DBExecuter) {}
  createWorkspace({}: Pick<
    InsertWorkspace,
    "name" | "organizationId" | "description" | "createdBy"
  >) {}
}
