import { type Project } from "../../db/schemas/projects";

type UpdateProjectMeta = Partial<
  Omit<
    Project,
    "id" | "createdAt" | "updatedAt" | "organizationId" | "workspaceId"
  >
>;

type AddOrDeleteProjectMembersMeta = {
  organizationMemberIds: string[];
};

function generateUpdateProjectMeta({
  archived,
  color,
  createdBy,
  description,
  icon,
  name,
}: UpdateProjectMeta) {
  return {
    archived,
    color,
    createdBy,
    description,
    icon,
    name,
  };
}

function generateAddOrDeleteProjectMembersMeta({
  organizationMemberIds,
}: AddOrDeleteProjectMembersMeta) {
  return {
    organizationMemberIds,
  };
}

export type { UpdateProjectMeta, AddOrDeleteProjectMembersMeta };
export { generateUpdateProjectMeta, generateAddOrDeleteProjectMembersMeta };
