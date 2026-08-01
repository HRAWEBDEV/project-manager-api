import { type Project } from "../../db/schemas/projects";

type UpdateProject = Partial<
  Omit<
    Project,
    "id" | "createdAt" | "updatedAt" | "organizationId" | "workspaceId"
  >
>;

type UpdateProjectMeta = {
  field: keyof UpdateProject;
  old: UpdateProject[keyof UpdateProject];
  new: UpdateProject[keyof UpdateProject];
};

type AddOrDeleteProjectMembersMeta = {
  organizationMemberIds: string[];
};

function generateUpdateProjectMeta({
  oldProject,
  newProject,
}: {
  oldProject: UpdateProject;
  newProject: UpdateProject;
}) {
  return Object.entries(newProject).reduce<UpdateProjectMeta[]>(
    (acc, [field, newValue]) => {
      const oldValue = oldProject[field as keyof UpdateProject];
      if (newValue !== undefined && oldValue !== newValue) {
        acc.push({
          field: field as keyof UpdateProject,
          old: oldValue,
          new: newValue,
        });
      }
      return acc;
    },
    [],
  );
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
