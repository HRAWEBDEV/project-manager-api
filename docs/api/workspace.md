# Workspaces API

Routes in `src/v1/api/routes/workspace/workspaces.ts` (`workspacesRoutes`, base path `/workspaces`). Per [`overview.md`](./overview.md#what-every-route-needs), every route here requires a session cookie and an `organization-id` header, but **not** a `workspace-id` header — this route group is mounted before `checkUserActiveWorkspace` runs in `src/v1/api/index.ts`, so no workspace role exists in context for any handler in this file (see the [Members note](#getting-members-relies-on-a-role-that-isnt-actually-guaranteed-to-exist) below for why that matters).

Every `checkUserPermission` call in this file uses `type: "organization"` **except** `GET /workspaces/members`, which uses `type: "organizationAndWorkspace"` — see [`../architecture/authorization.md`](../architecture/authorization.md#checking-permissions) for what that distinction means in general.

None of these routes call `eventBus.emit` — per [`../architecture/realtime.md`](../architecture/realtime.md), workspace mutations are not broadcast over WebSocket today, even though activity rows are recorded for them.

## `GET /workspaces`

- **Permission**: `workspace:read`, type `organization`
- **Query params**: `organization-id` (optional) — note this is a **query string parameter**, read separately from the `organization-id` *header* that `checkUserActiveOrganization` already required for the permission check. If omitted, the endpoint returns every workspace the caller can see across **all** organizations they belong to, not just the active one.
- **Response**: `{ workspaces: [...] }`, each row including `organizationName`, `organizationSlug`, `organizationRole`, and a computed `workspaceMemberRole` (an organization `owner` is reported as workspace `admin` here even without a `WorkspaceMember` row, mirroring the auto-promotion in `checkUserActiveWorkspace` — see [`../architecture/authorization.md`](../architecture/authorization.md#resolving-the-active-organization-and-workspace)).
- **Visibility**: `WorkspacesService.getWorkspaces` only returns a workspace if the caller has a `WorkspaceMember` row for it, **or** their organization role is `owner`/`admin`. A plain org `member` with no workspace membership sees nothing.

## `POST /workspaces`

- **Permission**: `workspace:create`, type `organization`
- **Body**: `{ name, description }` (`insertWorkspaceSchema` picked to those two fields)
- **Response**: `{ id }` of the created workspace, status `200` (no explicit `201` is set, unlike some other creation routes in this codebase).
- **Behavior**: runs in a single `db.transaction`:
  1. Creates the workspace. `slug` is generated server-side as `slugify(name) + "_" + nanoid(8)` — never client-supplied.
  2. Adds the creator as a `WorkspaceMember` with `role: "admin"`.
  3. Records a `"created"` workspace activity.

  All three steps commit or roll back together.

## `PATCH /workspaces/:id`

- **Permission**: `workspace:update`, type `organization`
- **Params**: `id` (workspace id, path)
- **Body**: `{ name?, description? }` (`updateWorkspaceSchema` picked to those two fields, both optional)
- **Response**: `{ id }` of the updated workspace, or `404` (`getApiErrorShape`) if no workspace matches `id` **and** the caller's active `organization-id`.
- **Behavior**: also a `db.transaction`. If `name` is supplied and actually differs from the current name, the slug is regenerated the same way as on create (`slugify(name) + "_" + nanoid(8)`) — updating only `description`, or setting `name` to its current value, leaves the slug untouched. An `"updated"` activity is recorded with an old/new diff (`generateUpdateWorkspaceMeta`); if the diff turns out empty, `WorkspaceActivityService` skips the insert (returns `[]`) — but note the route still attempts this whenever `oldWorkspace` was found, so this no-op case is decided inside the service, not the route.

## `DELETE /workspaces/:id`

- **Permission**: `workspace:delete`, type `organization`
- **Params**: `id` (workspace id, path)
- **Response**: `{ id }` of the deleted workspace, or `404` if no workspace matches `id` + the caller's active organization.
- **Behavior**: deletes the row, then records a `"deleted"` activity. Deleting a workspace cascades to its `workspace_members`, `projects` (and everything under them), and `tags` at the database level — see [`../architecture/database.md`](../architecture/database.md#schema-conventions).

## `GET /workspaces/members`

- **Permission**: `workspace_member:read`, type `organizationAndWorkspace`
- **Query**: workspace scope comes from the `workspace-id` **header** directly (`getHeaderActiveWorkspace`), not from `checkUserActiveWorkspace`'s resolved context (which doesn't exist for this route group — see below).
- **Response**: `{ workspaceMembers: [...] }` — each row joined out to the member's user profile, organization, and workspace name, with the same owner→`admin` role mapping as `GET /workspaces`.

### Getting members relies on a role that isn't actually guaranteed to exist

This route is the one exception to `type: "organization"` in this file, and it's worth understanding why that's risky: `checkUserPermission({ type: "organizationAndWorkspace" })` only falls through to checking the *workspace* role if the *organization* role doesn't already grant the permission (see [`../architecture/authorization.md`](../architecture/authorization.md#checking-permissions)). Org `owner`/`admin` grant `workspace_member:read`, so for those callers this route works fine. But an org `member` has **no** organization permissions at all (per [`../architecture/authorization.md`](../architecture/authorization.md#two-independent-role-systems)), so the check falls through to `getContextUserWorkspaceRole(c)` — and because `checkUserActiveWorkspace` never runs for anything mounted in `workspacesRoutes`, that getter has nothing to read and **throws** (`"User workspace role not set"`), which is not caught as a normal `403` — it surfaces as an unhandled error. In practice: only organization `owner`/`admin` can successfully call `GET /workspaces/members` today; a workspace admin who is only an org `member` will hit a server error instead of a clean authorization response.

## `POST /workspaces/members`

- **Permission**: `workspace_member:create`, type `organization`
- **Body**: `{ organizationMemberId, role }` (`insertWorkspaceMember` picked to those fields; `role` is `"admin" | "member"`)
- **Scope**: workspace comes from the `workspace-id` header; `addedBy` is set to the caller's user id.
- **Response**: `{ id }` of the created membership row, status `200`.
- Note: no existence check that `organizationMemberId` actually belongs to the active organization — a `DrizzleQueryError` (e.g. FK violation) would surface via the central error handler if it's invalid; there's no application-level guard in the route/service.

## `PATCH /workspaces/members/:id`

- **Permission**: `workspace_member:update`, type `organization`
- **Params**: `id` (workspace member row id, path)
- **Body**: `{ role }` — validated with `selectWorkspaceMemberSchema.pick({ role: true })` (the *select* schema, not an update/insert schema — functionally fine here since it's a single enum field, but worth noting as the odd one out).
- **Scope**: workspace comes from the `workspace-id` header.
- **Response**: `{ id, role }` of the updated row, or `404` if no member with that `id` exists in that workspace.

## `DELETE /workspaces/members/:id`

- **Permission**: `workspace_member:delete`, type `organization`
- **Params**: `id` (workspace member row id, path)
- **Scope**: workspace comes from the `workspace-id` header.
- **Response**: `{ id }` of the deleted row, or `404` if no member with that `id` exists in that workspace.
