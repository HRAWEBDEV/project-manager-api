# Authorization

Authorization builds on top of the identity established in [`authentication.md`](./authentication.md): once a request has a resolved user, it is additionally scoped to an **active organization** and an **active workspace**, each carrying its own role. This document covers how those roles are resolved, how permissions are checked, and where resource-level visibility (as opposed to role-based access) lives.

## Two independent role systems

- **Organization roles** — `owner` / `admin` / `member` (`utils/organizationPermissions.ts`)
- **Workspace roles** — `admin` / `member` (`utils/workspacePermissions.ts`)

Both are defined the same way: a role maps to a flat array of permission strings shaped `"<resource>:<action>"` (e.g. `"task:update"`, `"organization_member:delete"`, `"workspace_member:create"`). `hasPermission(role, permission)` in each file is just an `Array.includes` check against that role's list — there's no inheritance chain to reason about, each role's permission list is written out in full.

At the organization level, `member` has **no** permissions at all — membership alone grants nothing beyond being able to resolve as a member; all actual capabilities come from `owner` or `admin`. At the workspace level, `member` does have a real (if reduced) permission set — e.g. it can create/update/delete its own tasks and read most resources, but can't manage workspace membership or delete a project.

These two systems are **additive**, not hierarchical: a request's effective permissions are the union of what its organization role and workspace role separately grant (see [Checking permissions](#checking-permissions) below), not a single merged role.

## Resolving the active organization and workspace

Two headers select which organization/workspace a request acts within:

| Header | Resolved by | Sets |
|---|---|---|
| `organization-id` | `checkUserActiveOrganization` | the caller's `OrganizationMember` row |
| `workspace-id` | `checkUserActiveWorkspace` | the caller's effective `WorkspaceRole` |

Both run after `checkSessionUser` in the pipeline (see [`overview.md`](./overview.md#request-pipeline)) — resolving these requires a known user first. Each middleware:

1. Requires the header to be present — missing header → `400 Bad Request` (this is a client error, not an auth failure: the caller forgot to say which org/workspace it means).
2. Looks up membership for that org/workspace. No membership row → `403 Forbidden`.
3. Stores the result in context (`setContextUserOrganizationMember`, `setContextUserWorkspaceRole`) for every route group mounted after it.

**Organization owners are auto-promoted to workspace `admin`.** `checkUserActiveWorkspace` checks the caller's organization role first: if it's `owner`, the workspace role is set to `admin` unconditionally, without a `WorkspaceMember` row needing to exist. This is what lets an org owner administer every workspace in their organization by default, rather than needing to be explicitly added to each one.

## Checking permissions

Route handlers gate access with `checkUserPermission({ type, rolePermission })` (`middlewares/checkUserPermission.ts`), placed in the route chain after the identity/role middleware above have run. `type` selects which role(s) are checked:

- **`"organization"`** — only the organization role needs to grant `rolePermission`. Used for actions that should stay under organization control even though the underlying resource is workspace-scoped — e.g. every workspace mutation route (`workspace:create` / `update` / `delete`) and all workspace-membership management routes (`workspace_member:create` / `update` / `delete`) in `workspaces.ts` use `type: "organization"`, because a plain workspace `admin` should not be able to add or remove members of their own workspace — only an org `owner`/`admin` can.
- **`"workspace"`** — only the workspace role needs to grant `rolePermission`.
- **`"organizationAndWorkspace"`** — passes if **either** role grants `rolePermission`. This is the common case for project/task/tag/board routes (`project:read`, `task:read`, `task_approver:update`, `workspace_member:read`, etc.) — it lets an org owner/admin reach workspace-scoped resources without needing their own `WorkspaceMember` row, while workspace members get access purely from their workspace role.

```ts
// projects.ts — either role can grant project:create
checkUserPermission({ rolePermission: "project:create", type: "organizationAndWorkspace" })

// workspaces.ts — only the organization role can grant workspace_member:delete
checkUserPermission({ rolePermission: "workspace_member:delete", type: "organization" })
```

A failed check short-circuits with `403 Forbidden` via `getApiErrorShape`, before the handler or any service code runs.

## Reading roles in a handler

Handlers that need the raw role (rather than a single permission check) read it with the same fail-fast getter pattern used for session identity:

- `getContextUserOrganizationMember(c)` — the caller's `OrganizationMember` row (includes `.role`)
- `getContextUserWorkspaceRole(c)` — the caller's resolved `WorkspaceRole`

Both throw if read before their middleware ran, so a route wired before `checkUserActiveOrganization`/`checkUserActiveWorkspace` in `src/v1/api/index.ts` fails immediately instead of silently treating the caller as unauthorized.

## What role-based checks don't cover: resource-level visibility

`checkUserPermission` answers "can a role in general perform this action," not "can this specific caller see/touch this specific row." Project-level membership (`ProjectMember`) is tracked independently of organization and workspace membership and is **not** part of `checkUserPermission` at all — filtering to the projects/tasks a caller actually belongs to is done in the service layer instead (e.g. `TasksService.getTasks` joins through `organizationMembers`/`projectMembers` to scope results). See [`overview.md`](./overview.md#route--service--schema-layering) for why that split exists: middleware establishes identity and role, services own per-resource visibility.

## Permission catalog

Permission strings follow `<resource>:<action>` across both role systems, covering: `organization`, `organization_member`, `organization_invitation`, `workspace`, `workspace_member`, `project`, `project_member`, `task`, `task_assignee`, `task_checklist`, `task_approver`, `task_tag`, `tag`, `board`, `comment`, `priority`, `status`, `assignee`. Not every resource/action pair is wired to a route yet (e.g. `priority`/`status`/`comment` permissions exist in both permission tables but have no corresponding routes today) — treat the permission lists in `organizationPermissions.ts` / `workspacePermissions.ts` as the source of truth for what's grantable, and the routes themselves as the source of truth for what's actually enforced.
