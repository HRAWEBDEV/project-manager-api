# Boards API

Project-scoped kanban boards. Every route in this group requires a session cookie, an `organization-id` header, and a `workspace-id` header (see [`overview.md`](./overview.md#what-every-route-needs)). All four routes use `checkUserPermission({ type: "organizationAndWorkspace", ... })` — either the caller's organization role or workspace role can satisfy the check (see [`../architecture/authorization.md`](../architecture/authorization.md#checking-permissions)).

Source: `src/v1/api/routes/boards/boards.ts`, `src/v1/api/services/boardsServices.ts`, `src/v1/db/schemas/boards.ts`.

## `GET /boards`

List boards for a project, ordered by `position` then `createdAt`.

- **Permission**: `board:read`
- **Query params**: `project-id` (required) — validated against `selectBoardSchema.pick({ projectId: true })`. Since `boards.projectId` is a non-nullable column, a missing/invalid `project-id` fails Zod validation and returns `400` (via the centralized `ZodError` handler) rather than a custom error.
- **Scoping**: results are additionally filtered by joining to `projects` and matching the active `workspace-id` header (`getBoards` inner-joins `boards` to `projects` and filters on `projects.workspaceId`), so a `project-id` from a different workspace than the active one returns an empty list rather than an error.
- **Response**: `200` — `{ "boards": Board[] }`, each board shaped `{ id, name, position, color, createdBy, createdAt, updatedAt, projectId }`.

## `POST /boards`

Create a board.

- **Permission**: `board:create`
- **Body**: `{ name, projectId, color? }` — validated against `insertBoardSchema.pick({ name, color, projectId })`.
- **Project check**: before creating, the handler loads the project via `ProjectsService.getProject` scoped to the caller (`userId`), the active `workspace-id` header, and the given `projectId`. If no matching project is found, responds `404` — note the error message is `"Task not found"` (a copy-paste artifact from the tasks route; the actual failure is an unresolvable project).
- **Position**: **the caller cannot set the position.** `BoardsService.createBoard` computes it server-side as `MAX(position) + 1` for that project (`1` if the project has no boards yet) — there is no way to insert a new board at a specific position.
- **Response**: `200` — `{ id }` (the board's Drizzle-inserted id; not the full row).
- **Note**: unlike the analogous project/task/workspace routes, this handler does not record an activity or emit an `eventBus` event — board creation does not currently produce a real-time update (see [`../architecture/realtime.md`](../architecture/realtime.md)).

## `PATCH /boards/:id`

Update a board's name, color, and/or position.

- **Permission**: `board:update`
- **Params**: `id` — board id (path).
- **Body**: `{ name?, color?, position? }` — validated against `updateBoardSchema.pick({ name, color, position })`; all fields optional.
- **Lookup**: the board must exist within the active workspace (`BoardsService.getBoard`, scoped by `workspaceId` via the `projects` join) — no match → throws `NotFoundError` → `404`.
- **Reordering is implemented**, not just a raw position overwrite: `updateBoard` runs in a transaction that temporarily zeroes the target board's position, shifts every other board in the same project that sits between the old and new position by ±1 (decrementing if moving down, incrementing if moving up), then sets the target board to `position` (or its existing position if `position` wasn't supplied). This keeps the per-project `position` sequence contiguous and avoids colliding with the table's `(projectId, position)` unique constraint.
- **Response**: `200` — `{ id }` of the updated board.
- Same as create: no activity record or `eventBus` emit — no real-time update.

## `DELETE /boards/:id`

Delete a board.

- **Permission**: `board:delete`
- **Params**: `id` — board id (path).
- **Lookup**: same as update — must resolve within the active workspace, or `404` via `NotFoundError`.
- **Position compaction**: after deleting, every board in the same project with a higher `position` is decremented by 1, keeping the sequence contiguous (no gap left where the deleted board was).
- **Response**: `200` — `{ id }` of the deleted board.
- No activity record or `eventBus` emit.

## Not covered by this route group

There is no dedicated "get board by id" or "reorder many boards at once" endpoint — reordering happens implicitly as a side effect of `PATCH /boards/:id`'s `position` field, one board at a time.
