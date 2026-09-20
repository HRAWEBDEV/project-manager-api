# Projects API

Base path: `/api/v1/projects` (mounted from `src/v1/api/routes/projects/projects.ts`). Requires a session cookie, an `organization-id` header, and a `workspace-id` header — see [`overview.md`](./overview.md#what-every-route-needs). Every permission check in this file uses `type: "organizationAndWorkspace"` (see [`../architecture/authorization.md`](../architecture/authorization.md#checking-permissions)): either the caller's organization role or workspace role granting the permission is sufficient.

Projects are the only domain currently wired to real-time updates — see [`../architecture/realtime.md`](../architecture/realtime.md). Each mutation below notes whether it emits on `eventBus`.

## Visibility is narrower than the permission check

`checkUserPermission` only proves the caller's role *can* read projects in general. The actual rows returned by `GET /` (and by the single-project lookup every other handler uses internally) are further filtered by `ProjectsService.getProjects` to projects in the active workspace where **at least one** of the following holds for the caller:
- their organization role is `owner`, or
- their workspace role is `admin`, or
- they have an explicit `ProjectMember` row for that project.

A plain workspace `member` who is not an explicit project member will pass the `project:read` permission check but see nothing for that project — this is the resource-level visibility split described in [`../architecture/authorization.md#what-role-based-checks-dont-cover-resource-level-visibility`](../architecture/authorization.md#what-role-based-checks-dont-cover-resource-level-visibility). Creating a project automatically adds the creator as a `ProjectMember`, so creators always retain visibility.

## `GET /`

List projects in the active workspace visible to the caller (per the rule above).

- **Permission**: `project:read`
- **Query params**: none
- **Response** `200`: `{ "projects": Project[] }` — each project has `id, name, description, icon, color, createdBy, archived, organizationId, workspaceId` (no timestamps).

## `POST /`

Create a project in the active workspace.

- **Permission**: `project:create`
- **Body** (`insertProjectSchema` picked to): `{ name: string, description?: string, color?: string, icon?: string }` — `name` is required (max 100 chars per the column).
- **Response** `200`: `{ "id": "<uuid>" }` — only the new project's ID, not the full row.
- **Side effects**:
  - Runs in a transaction: creates the project, adds the creator as a `ProjectMember`, and logs a `created` activity.
  - Emits `eventBus.emit("created", { type: "created", projectId, meta: null })`.

## `PATCH /:id`

Update a project's editable fields.

- **Permission**: `project:update`
- **Body** (`updateProjectSchema` picked to): `{ name?, description?, color?, icon?, archived? }` — this is how projects are archived/unarchived (`archived: boolean`).
- **Response** `200`: `{ "id": "<uuid>" }`. `404` (`"Project not found"`) if no row matches `id` + the active organization/workspace.
- **Side effects**: fetches the pre-update row first; if found, diffs old vs. new (`generateUpdateProjectMeta`) and logs an `updated` activity **only if at least one field actually changed** — a no-op patch (same values) produces no activity row and no `eventBus` emit. See [`../architecture/realtime.md#from-mutation-to-broadcast`](../architecture/realtime.md#from-mutation-to-broadcast).

## `POST /:id/icon`

Upload/replace a project's icon image.

- **Permission**: `project:update`
- **Body**: `multipart/form-data` with an `image` file field. Rejected with `400` (`"Image is not a file"`) if `image` isn't a file at all.
- **Constraints** (`StaticImagesService`, shared with other image uploads): allowed types `image/jpeg`, `image/png`, `image/webp`; max size 5 MB. Violating either throws `InvalidImageTypeError` / `ImageTooLargeError`, both caught here and returned as `400` with the error's message.
- **Response** `200`: `{ "message": "icon updated successfully", "avatarUrl": "<origin>/static/images/projects/icon/<uuid>.<ext>", "projectId": "<uuid>" | null }` — note the field is named `avatarUrl` even though this is a project icon, not a user avatar.
- **Side effects**: saves the new file to `static/images/projects/icon/`, deletes the previous icon file if one existed, updates `projects.icon`, and logs + emits an `updated` activity with `meta: { oldProject: { icon }, newProject: { icon } }`.

## `DELETE /:id/icon`

Remove a project's icon.

- **Permission**: `project:update`
- **Response** `200`: `{ "message": "icon removed successfully", "projectId": "<uuid>" }`. `404` if the project doesn't exist under the active organization/workspace. If the project has no icon set, returns the same success message immediately without touching the database or filesystem.
- **Side effects** (only when an icon exists): deletes the static file, sets `projects.icon` to `""` (empty string, not `null`), and logs + emits an `updated` activity.

## `DELETE /:id`

Delete a project.

- **Permission**: `project:delete`
- **Response** `200`: the deleted project's `{ "id": "<uuid>" }`. `404` (`"Project not found"`) if nothing matched.
- **Side effects**: deletes the row, then unconditionally attempts to log a `deleted` activity using the deleted project's ID.
- **Note**: the activity-logging call is not guarded by a "did anything actually get deleted" check the way `PATCH /:id` guards its `updated` activity. If `id` doesn't match an existing project, `deletedProject` is `undefined` and the code still calls `createProjectActivity` with `projectId: undefined` — since `project_activities.project_id` is `NOT NULL`, this throws a DB constraint error (surfaced as a `DrizzleQueryError` via the centralized error handler, see [`../architecture/overview.md#error-handling`](../architecture/overview.md#error-handling)) rather than cleanly returning the intended `404`.

## `GET /:id/members`

List a project's members.

- **Permission**: `project_member:read`
- **Response** `200`: `{ "projectMembers": ProjectMemberRow[] }`, each row joined with user info: `id, projectId, projectName, organizationMemberId, userId, username, userFirstName, userLastName, joinedAt, addedBy`.

## `POST /:id/members`

Add one or more members to a project.

- **Permission**: `project_member:create`
- **Body**: `{ "organizationMemberId": "<uuid>" | ["<uuid>", ...] }` — accepts either a single ID or an array (validated against `insertProjectMemberSchema.shape.organizationMemberId`, i.e. IDs must belong to `organizationMembers`, not raw user IDs).
- **Response** `200`: array of the created rows' `{ id }`.
- **Side effects**: inserts one `project_members` row per ID, then logs + emits a `member_added` activity with `meta: { organizationMemberIds }`.

## `DELETE /:projectId/members/:id`

Remove a member from a project. Note the path uses **two** distinct params: `:projectId` and `:id` (the `project_members` row ID) — this route does not reuse the `:id`-for-project convention of the other project routes.

- **Permission**: `project_member:delete`
- **Response** `200`: the deleted membership row's `{ "id": "<uuid>" }`. `404` (`"Project member not found"`) if `id`/`projectId` didn't match a row.
- **Side effects**: deletes the `project_members` row, then logs + emits a `member_removed` activity with `meta: { organizationMemberIds: [deletedMember?.id] }`. If the row didn't exist, this still runs with `organizationMemberIds: [undefined]` — unlike the `DELETE /:id` case above this doesn't throw (the `metadata` column is `jsonb` with no `NOT NULL` constraint), but it does produce a slightly meaningless activity row and broadcast for a delete that didn't actually happen.
