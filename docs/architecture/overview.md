# Architecture Overview

This document explains how the application is put together: the request lifecycle, the domain/permission model, the code layering convention, and how real-time updates are delivered.

The domain model is a four-level hierarchy — every resource belongs to exactly one parent, and permissions get more specific the deeper you go:

```
Organization → Workspace → Project → Task
```

Membership exists independently at the organization, workspace, and project levels; see the [Authorization model](#authorization-model) section below for how roles at each level combine.

## Runtime

The app runs on **Bun**, serving HTTP and WebSocket traffic from a single [Hono](https://hono.dev) app (`index.ts`). Bun's native `serve` handles both the HTTP `fetch` handler and the WebSocket upgrade, so there is no separate WS server process. **PostgreSQL** is the only datastore, accessed exclusively through **Drizzle ORM** — no query in the codebase talks to `pg` directly outside of `src/v1/db/connect.ts`.

## Request pipeline

`index.ts` builds the root Hono app and wires cross-cutting, app-wide middleware in order: request ID (`hono/request-id`) → structured logging (pino, tagged with the request ID) → CORS → secure headers. It then mounts all versioned routes at `/api` (`v1Routes` from `src/v1/api/index.ts`), serves `static/*` off disk for uploaded images, exposes `GET /healthy`, and registers the `/ws/*` upgrade route. On `SIGINT`/`SIGTERM` it stops the Bun server and closes the Postgres pool before exiting.

Inside `src/v1/api/index.ts`, route groups and identity-resolving middleware are interleaved in a single, **load-bearing order** — each middleware sets context that every route group *after* it is allowed to depend on:

```
authRoutes                        (no auth — signup / sign-in / logout)
checkSessionUser                  → sets user, session
usersRoutes
checkUserActiveOrganization       → sets the caller's OrganizationMember
organizationsRoutes, workspacesRoutes
checkUserActiveWorkspace          → sets the caller's workspace role
projectsRoutes, tasksRoutes, tagsRoutes, boardsRoutes
```

`checkUserActiveOrganization` reads an active-organization header and loads the caller's membership row; `checkUserActiveWorkspace` reads an active-workspace header and resolves a workspace role (auto-promoting org owners/admins to workspace `admin`). Context is exposed through typed getter/setter pairs (`getContextUser`/`setContextUser`, and the organization/workspace equivalents) rather than raw `c.set`/`c.get` calls — the getters **throw** if read before their middleware has run, so a route group wired in the wrong order fails fast instead of silently seeing `undefined`.

A single `onError` handler at the bottom of `src/v1/api/index.ts` dispatches on error type — `ZodError`, `NotFoundError`, `DrizzleQueryError`, otherwise a generic internal error — so individual routes never need to format these responses themselves.

## Authorization model

Two independent, **additive** role systems apply at different levels of the hierarchy:

- **Organization roles** — `owner` / `admin` / `member` (`utils/organizationPermissions.ts`)
- **Workspace roles** — `admin` / `member` (`utils/workspacePermissions.ts`)

Each role maps to a list of permission strings (`"task:update"`, `"organization_member:delete"`, etc.). Routes gate access with the `checkUserPermission({ type, rolePermission })` middleware, where `type` is:

- `"organization"` — checked against the org role only
- `"workspace"` — checked against the workspace role only
- `"organizationAndWorkspace"` — passes if *either* role grants the permission

The third mode is what lets an organization owner or admin act on workspace-scoped resources (projects, tasks, tags, boards) without needing an explicit `WorkspaceMember` row — org-level authority implicitly covers workspace-level actions.

## Route → service → schema layering

Every domain (`auth`, `users`, `organizations`, `workspaces`, `projects`, `tasks`, `tags`, `boards`, …) is split into three parallel files with a fixed responsibility split:

| Layer | Location | Responsibility |
|---|---|---|
| Route | `src/v1/api/routes/<domain>/<domain>.ts` | Hono handlers: parse the request with the domain's Zod schema, run `checkUserPermission`, call the service, shape the JSON response |
| Service | `src/v1/api/services/<domain>Service.ts` | A class constructed with a `DBExecuter`; owns every Drizzle query for that domain |
| Schema | `src/v1/db/schemas/<domain>.ts` | Drizzle table definition plus `drizzle-zod`-derived insert/select/update schemas, consumed directly by the route layer for validation |

A `DBExecuter` (`src/v1/db/connect.ts`) is either the pooled `db` singleton or an open Drizzle transaction — services never import `db` directly. This is what lets a route open one `db.transaction(...)` and construct several services against the same `tx`, so a multi-step write (e.g. creating a workspace, adding its creator as a member, and logging the activity) commits or rolls back as one unit:

```ts
const createdWorkspace = await db.transaction(async (tx) => {
  const workspaceService = new WorkspacesService(tx);
  const workspaceMemberService = new WorkspaceMembersService(tx);
  const workspaceActivityService = new WorkspaceActivityService(tx);
  // ...compose multiple writes against the same tx
});
```

Cross-cutting visibility rules — e.g. `TasksService.getTasks` joining through `organizationMembers`/`projectMembers` to filter to what the caller can actually see — live in the service layer, not in middleware. Middleware only establishes *identity and role* at the org/workspace level; resource-level visibility is a service concern.

## Events and real-time updates

`utils/eventBus.ts` is a process-local `node:events` `EventEmitter` singleton. Services emit domain events after a mutation (see `projectActivitiesMeta.ts` / `workspaceActivitiesMeta.ts` for the event shapes, e.g. `created` / `updated` / `deleted` / `member_added` / `member_removed`). At startup, `registerAppEvents` → `registerProjectEvents` subscribes to those event names and rebroadcasts each payload to WebSocket clients that have joined the corresponding project's room, via `WsConnectionsManager`.

On the connection side, `WebSocketManager` (constructed with a `WsConnectionsManager`) handles the `/ws/*` upgrade, and `WsConnectionsManager` tracks each open socket plus which rooms (`organization` / `workspace` / `project` / `chat`) it has joined, so a broadcast only reaches sockets subscribed to the affected project. The rule for new mutations: if a change should be visible live, **emit it on `eventBus`** rather than writing to the socket layer directly — that keeps the write path and the fan-out path decoupled.

## Error handling

Routes don't throw raw errors for expected failure cases. Two patterns are used instead:

- Return a JSON error via `getApiErrorShape` (see `utils/apiTypes.ts` and existing handlers) for in-line failures like a 403 from a failed permission check.
- Throw `NotFoundError` (`utils/NotFound.ts`) and let it propagate to the centralized `onError` in `src/v1/api/index.ts`.

`DrizzleQueryError` and `ZodError` are already normalized centrally (`handleDbError`, `handleZodError`) — routes should not duplicate that handling.
