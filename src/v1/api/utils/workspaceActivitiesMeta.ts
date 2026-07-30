import { type Workspace } from "../../db/schemas/workspaces";

type UpdateWorkspaceMeta = Partial<
  Omit<Workspace, "id" | "createdAt" | "updatedAt" | "organizationId">
>;

type AddOrDeleteWorkspaceMembersMeta = {
  organizationMemberIds: string[];
};

function generateUpdateWorkspaceMeta({
  createdBy,
  description,
  name,
  slug,
}: UpdateWorkspaceMeta) {
  return {
    createdBy,
    description,
    name,
    slug,
  };
}

function generateAddOrDeleteWorkspaceMembersMeta({
  organizationMemberIds,
}: AddOrDeleteWorkspaceMembersMeta) {
  return {
    organizationMemberIds,
  };
}

export type { UpdateWorkspaceMeta, AddOrDeleteWorkspaceMembersMeta };
export { generateUpdateWorkspaceMeta, generateAddOrDeleteWorkspaceMembersMeta };
