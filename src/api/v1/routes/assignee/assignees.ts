import { Hono, type Handler } from "hono";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import type { WithSessionVariables } from "../auth/utils/contextSessionVariables";
import {
  assignees,
  selectAssigneeSchema,
  insertAssigneeSchema,
} from "../../../../db/v1/schemas/assignees";
import { tasks } from "../../../../db/v1/schemas/tasks";
import { projects } from "../../../../db/v1/schemas/projects";
import { users } from "../../../../db/v1/schemas/users";
import { getUser } from "../auth/utils/contextSessionVariables";
import { getHeaderWorkspaceID } from "../workspace/member/utils/headerWorkspaceCredentials";
import { checkProjectMember } from "../projects/utils/checkProjectMember";
import { checkWorkspaceOrganizationOwner } from "../workspace/utils/checkWorkspaceOrganizationOwner";
import { checkTaskMember } from "../tasks/utils/checkTaskMember";
import { db } from "../../../../db/v1/connect";
import { eq, sql, and, exists, or } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";
import { projectMembers } from "../../../../db/v1/schemas/projectMember";

const assigneeRoutes = new Hono().basePath("/assignees");

const handleGetAssignees: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const workspaceId = getHeaderWorkspaceID(c);
  const taskIdQuery = c.req.query("task-id");
  const { taskId } = selectAssigneeSchema.pick({ taskId: true }).parse({
    taskId: taskIdQuery,
  });
  const result = await db
    .select({
      assigneeId: assignees.id,
      taskId: tasks.id,
      projectId: projects.id,
      projectName: projects.name,
      projectMemberId: users.id,
      projectMemberName: sql<string>`
        concat(${users.firstName}, ' ', ${users.lastName})
      `,
      createdAt: assignees.createdAt,
    })
    .from(assignees)
    .innerJoin(tasks, eq(assignees.taskId, tasks.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(projectMembers, eq(assignees.projectMemberId, projectMembers.id))
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.workspaceId, workspaceId!),
        or(
          exists(checkProjectMember(tasks.projectId, user.id)),
          exists(checkWorkspaceOrganizationOwner(tasks.workspaceId, user.id)),
        ),
      ),
    )
    .orderBy(assignees.createdAt, users.lastName, users.firstName);

  return c.json({
    assignees: result,
  });
};

assigneeRoutes.get(
  "/",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "assignee:read",
  }),
  handleGetAssignees,
);

const handleCreateAssignee: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const { taskId, projectMemberId } = await c.req.json();
  const parsedBody = insertAssigneeSchema.parse({ taskId, projectMemberId });
  const isMember = await checkTaskMember(taskId, user.id);
  if (isMember.length === 0) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.FORBIDDEN,
        message: "You are not a member of this project",
      }),
    );
  }
  const [createdAssignee] = await db
    .insert(assignees)
    .values({
      taskId: parsedBody.taskId,
      projectMemberId: parsedBody.projectMemberId,
    })
    .returning({
      id: assignees.id,
    });

  return c.json(createdAssignee);
};
assigneeRoutes.post(
  "/",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "assignee:create",
  }),
  handleCreateAssignee,
);

// how can a user delete a task assignee => 1)be a owner! 2)think about it more ...
const handleDeleteAssignee: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {};

assigneeRoutes.delete(
  "/:id",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "assignee:delete",
  }),
  handleDeleteAssignee,
);

export { assigneeRoutes };
