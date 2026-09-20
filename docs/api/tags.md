# Tags API

Workspace-scoped labels attachable to tasks (via `task_tags`, not covered here — see [`tasks.md`](./tasks.md)). Source: `src/v1/api/routes/tags/tags.ts`, `src/v1/api/services/tagsServices.ts`, `src/v1/db/schemas/tags.ts`.

All routes require a session cookie, an `organization-id` header, and a `workspace-id` header — see [`overview.md`](./overview.md#what-every-route-needs). Every operation is scoped to the workspace named by the `workspace-id` header; there is no cross-workspace tag access.

## `GET /tags`

Lists all tags in the active workspace, ordered by `createdAt` ascending.

- **Permission**: `tag:read`, `type: "organizationAndWorkspace"`
- **Request**: no body or query params
- **Response** `200`: `{ "tags": Tag[] }` — full tag rows (`id`, `workspaceId`, `name`, `color`, `createdAt`)

## `POST /tags`

Creates a tag in the active workspace.

- **Permission**: `tag:create`, `type: "organizationAndWorkspace"`
- **Request body**: `{ "name": string, "color"?: string | null }` — validated via `insertTagSchema.pick({ name: true, color: true })` (`name` required, max length 100; `color` optional, max length 20)
- **Response** `200`: the raw Drizzle `.returning()` result — **an array** containing one object shaped `{ "id": string }`, e.g. `[{ "id": "..." }]`. Note this is inconsistent with `PATCH`/`DELETE` below, which return a single object rather than an array, and neither returns the created/updated `name`/`color` — only `id`.
- **Errors**: a duplicate `(name, workspaceId)` pair violates the `tag_workspace_name_unique` constraint (`src/v1/db/schemas/tags.ts`) and is not caught in the route — it surfaces as a `DrizzleQueryError`, normalized by the central `onError` handler (see [`overview.md`](./overview.md#error-shape)), not a route-specific message.

## `PATCH /tags/:id`

Updates a tag's `name` and/or `color`. `:id` is the tag ID.

- **Permission**: `tag:update`, `type: "organizationAndWorkspace"`
- **Request body**: `{ "name"?: string, "color"?: string | null }` — validated via `updateTagSchema.pick({ name: true, color: true })` (both optional; either or both may be provided)
- **Response** `200`: `{ "id": string }` if a row matched `(id, workspaceId)`, otherwise `undefined` (empty body) — there is no explicit `404` for an unknown/foreign tag ID, it just silently returns nothing.
- **Errors**: same unique-constraint behavior as `POST` if the update collides with another tag's name in the same workspace.

## `DELETE /tags/:id`

Deletes a tag. `:id` is the tag ID.

- **Permission**: `tag:delete`, `type: "organizationAndWorkspace"`
- **Request**: no body
- **Response** `200`: `{ "id": string }` if a row matched `(id, workspaceId)`, otherwise `undefined` (empty body) — same no-404-for-unknown-id behavior as `PATCH`.
- **Note**: `task_tags` rows referencing this tag have no `onDelete` behavior specified on their foreign key (`src/v1/db/schemas/taskTags.ts`), so deleting a tag still in use is blocked by Postgres (`NO ACTION`) rather than cascading — this would surface as a `DrizzleQueryError` via the central error handler, not a friendly route-level message.
