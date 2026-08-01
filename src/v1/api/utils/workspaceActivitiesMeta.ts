import { type Workspace } from "../../db/schemas/workspaces";

type UpdateWorkspace = Partial<
  Omit<Workspace, "id" | "createdAt" | "updatedAt" | "organizationId">
>;

type UpdateWorkspaceMeta = {
  field: keyof UpdateWorkspace;
  old: UpdateWorkspace[keyof UpdateWorkspace];
  new: UpdateWorkspace[keyof UpdateWorkspace];
};

type AddOrDeleteWorkspaceMembersMeta = {
  organizationMemberIds: string[];
};

function generateUpdateWorkspaceMeta({
  oldWorkspace,
  newWorkspace,
}: {
  oldWorkspace: UpdateWorkspace;
  newWorkspace: UpdateWorkspace;
}) {
  return Object.entries(newWorkspace).reduce<UpdateWorkspaceMeta[]>(
    (acc, [field, newValue]) => {
      const oldValue = oldWorkspace[field as keyof UpdateWorkspace];
      if (newValue !== undefined && oldValue !== newValue) {
        acc.push({
          field: field as keyof UpdateWorkspace,
          old: oldValue,
          new: newValue,
        });
      }
      return acc;
    },
    [],
  );
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
