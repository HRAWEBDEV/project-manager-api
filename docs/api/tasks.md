# Tasks API

Base path: `/tasks` (full path `/api/v1/tasks`). Requires a session cookie, `organization-id` header, and `workspace-id` header — see [`overview.md`](./overview.md#what-every-route-needs). Source: `src/v1/api/routes/tasks/tasks.ts`.

Every route in this file uses `checkUserPermission({ type: "organizationAndWorkspace", rolePermission: ... })` — either the caller's organization role or workspace role must grant the permission (see [`../architecture/authorization.md`](../architecture/authorization.md#checking-permissions)).

None of these routes emit onto `eventBus` — task mutations do **not** currently push WebSocket updates (only `projects.ts` does today; see [`../architecture/realtime.md`](../architecture/realtime.md)).

## Visibility beyond permissions

`TasksService.getTasks` (used by every read in this file, including the single-task lookups inside mutation handlers) restricts results to the given `workspaceId` **and** requires the caller to be an organization `owner`/`admin` **or** a member of the task's project (`projectMembers` row must exist) — a plain workspace member who isn't on the project cannot see or resolve its tasks even with `task:read`. This is the resource-level visibility layer described in [`../architecture/authorization.md#what-role-based-checks-dont-cover-resource-level-visibility`](../architecture/authorization.md#what-role-based-checks-dont-cover-resource-level-visibility). Because mutation handlers reuse `getTask`/`getTasks` to look up the target row, a task outside this visibility scope returns `404 Task not found` rather than `403` — the caller can't distinguish "doesn't exist" from "you can't see it."

---

## `GET /tasks`

**Permission:** `task:read`

**Query params:**
- `project-id` (optional) — filter to one project
- `assignees` (optional, repeatable, e.g. `?assignees=<id>&assignees=<id>`) — filter to tasks assigned to any of the given `organizationMemberId`s

**Response `200`:** `{ tasks: Task[] }`, each task including joined `projectName`, `workspaceId`/`workspaceName`, `boardId`/`boardName`/`boardColor`, and a nested `assignees` array (each with `organizationMemberId`, `userId`, `username`, `firstName`, `lastName`, `avatar`, `completedAt`).

## `POST /tasks`

**Permission:** `task:create`

**Body:** `{ title, description?, parentTaskId?, startAt?, endAt?, projectId }` (validated against `createTaskSchema`, picking these fields).

Looks up the target project via `ProjectsService.getProject` scoped to the active workspace and caller — if not found, returns `404` with message **`"Task not found"`** (this message is copy-pasted from the task-not-found case elsewhere; the actual failure here is the project not being found/visible).

**Response `201`... actually `200`:** `{ id }` — only the new task's id, not the full row. Note `createdBy` is accepted by the schema/service but is **not** populated from the authenticated user here — the route never passes it to `createTask`, so new tasks are created with a null creator.

## `PATCH /tasks/:id`

**Permission:** `task:update`

**Body:** `{ title?, description?, startAt?, endAt? }` (`updateTaskSchema`, picking these fields).

Looks up the task via `TasksService.getTask` (subject to the visibility rules above) — `404 Task not found` if missing/not visible. Then updates and returns `{ id }` of the updated row (a second, redundant `404 Task not found` check follows the update call — dead code, since `updateTask` only fails to return a row if the id it was just given doesn't exist).

---

## Assignees

### `GET /tasks/:id/assignees`

**Permission:** `task_assignee:read`

**Response `200`:** `{ taskAssignees: [...] }` — each entry has `organizationMemberId`, `userId`, `username`, `firstName`, `lastName`, `avatar`, `completedAt`.

### `PATCH /tasks/:id/assignees`

**Permission:** `task_assignee:update`

**Body:** `{ assignees: string[] }` — an array of `organizationMemberId`.

**This is a full replace, not a partial update**: `TaskAssigneesServices.updateTaskAssignees` deletes every existing assignee row for the task and re-inserts the given list inside one transaction, so omitting an id un-assigns them.

Extra guard: if the caller is a plain `member` at **both** the organization and workspace level, *and* the caller's own `organizationMemberId` is not present in the new `assignees` list, the handler calls `checkTaskAssignee` to verify the caller is currently assigned to the task. **This check does not actually block the request** — `checkTaskAssignee` sets a `403` status and returns a JSON error object, but the handler discards that return value, falls through, and performs the full replace anyway. The net effect: `c.status(403)` is left set on the context, and the handler's own `return c.json(updatedAssignees)` call (with no explicit status argument) picks up that leftover `403`, so the HTTP response is a `403` status **with the successful update result as its body** — and the assignee list is updated regardless of whether the guard "passed."

## Checklists

### `GET /tasks/:id/checklists`

**Permission:** `task_checklist:read`

**Response `200`:** `{ checklists: [...] }`, ordered by `sortNo` — each with `title`, `isCompleted`, `completedAt`.

### `PATCH /tasks/:id/checklists`

**Permission:** `task_checklist:update`

**Body:** `{ checklists: [{ id?, title, isCompleted, sortNo }] }` (`insertTasksChecklists` minus `taskId`, as an array).

Same guard pattern as assignees: if the caller is `member`/`member` (org role and workspace role), `checkTaskAssignee` is called to require the caller be a task assignee — and the same non-blocking bug applies here too (the forbidden result is discarded; the checklist replace proceeds regardless, leaving a `403` status on an otherwise-successful response).

**Full replace, not partial**: existing checklist items are deleted and the given list re-inserted. `TaskChecklistsServices.updateTaskChecklist` tries to preserve `completedAt` for items that already existed and are marked complete, but the lookup has a variable-shadowing bug — inside the `.find()` callback, the inner `item` parameter shadows the outer loop's `item`, so the condition `oldChecklists.find((item) => item.id === item.id)` always compares an item to itself and is always `true`. In practice this means `completedAt` preservation always resolves to the **first** old checklist item, not the one actually matching by id.

## Task tags

### `GET /tasks/:id/tags`

**Permission:** `task_tag:read`

**Response `200`:** `{ taskTags: [...] }`, each with `tagId`, `tagName`, `tagColor`.

### `PATCH /tasks/:id/tags`

**Permission:** `task_tag:update`

**Body:** `{ tags: [{ taskId, tagId }] }` (`insertTaskTagSchema`, picking both fields, as an array).

**Full replace**: existing task-tag links are deleted and the given list re-inserted, scoped by the `:id` path param — the `taskId` inside each body item is validated by the schema but not actually cross-checked against the path param by the service (only `tagId` from each item is used; the path param's task id is what the delete/insert operate on). No assignee/role guard is applied on this route, unlike assignees and checklists.

## Task approvers

### `GET /tasks/:id/approvers`

**Permission:** `task_approver:read`

**Response `200`:** `{ taskApprovers: [...] }`, each with `organizationMemberId`, `approved`, `approvedAt`, `username`, `userFirstName`, `userLastName`, `userAvatar`.

### `PATCH /tasks/:id/approvers`

**Permission:** `task_approver:update`

**Body:** `{ approvers: [{ organizationMemberId, taskId }] }`.

Requires the caller to currently be an assignee of the task (`TaskAssigneesServices.getTaskAssignee`) — if not, returns `403 "You are not the assignee of this task"` (this check *is* enforced correctly, via an early `return`, unlike the checklist/assignee guards above).

**Full replace**: existing approver rows are deleted and the given list re-inserted. `updateTaskApprovers` tries to carry forward each approver's prior `approved`/`approvedAt` state, but has the same self-referencing shadowing bug as the checklist update (`oldApprovers.find((item) => item.organizationMemberId === item.organizationMemberId && item.taskId === item.taskId)` always matches the first old approver) — so preserved approval state is effectively random with respect to which approver it's applied to whenever more than one approver already existed.

### `PATCH /tasks/:id/approvers/approve`

**Permission:** `task_approver:update`

**Body:** `{ approve: boolean }`

Requires the caller to be an assignee of the task (same `403` check as above). Sets the caller's own approver row's `approved`/`approvedAt` (setting `approvedAt` to now if approving, `null` if not). **Response `200`:** `{ id }` of the updated approver row.

After updating, the handler re-fetches all approvers and checks whether every one has `approved === true`, but the branch is an empty `// TODO` — nothing happens when all approvers have signed off (no task completion, no event, no notification).
