# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Runtime is Bun (not Node) — use `bun`/`bunx`, not `npm`/`npx`, for anything not listed below.

- `bun run dev` — start the dev server with watch mode (`NODE_ENV=development`)
- `bun run start` — start in watch mode with `NODE_ENV=production`
- `bun run typecheck` — type-check with `tsc --noEmit` (no test suite exists in this repo; use this as the correctness gate)
- `bun run db:generate` — generate a Drizzle migration from schema changes in `src/v1/db/schemas`
- `bun run db:migrate` — apply pending migrations
- `bun run db:seed` — run `src/v1/db/seed.ts`
- `bun run open:studio` — launch Drizzle Studio

Required env vars: `DATABASE_URL` (Postgres connection string; app throws at import time if unset) and `PORT` (defaults to 8080 with a warning if unset).

## Architecture

Hono API server on Bun, backed by Postgres via Drizzle ORM. Domain model is a four-level hierarchy (see `docs/architecture/` for full details — `overview.md`, `authentication.md`, `authorization.md`, `database.md`, `realtime.md`, `logging.md` — and `docs/api/` for per-domain endpoint docs):

```
Organization -> Workspace -> Project -> Task
```

Every resource belongs to exactly one parent, and permissions get more specific the deeper you go. Membership exists independently at the organization, workspace, and project levels. Nested resources (invitations, members, activities, task assignees/checklists/approvers/tags) are not separate top-level route domains — they're handled as sub-routes inside their parent domain's single route file (e.g. organization invitations and members both live in `routes/organizations/organizations.ts`; task assignees/checklists/approvers/tags in `routes/tasks/tasks.ts`).

### Request pipeline (`index.ts` -> `src/v1/api/index.ts`)

`index.ts` builds the root Hono app: request ID, structured logging (pino via `@hono/structured-logger`), CORS, secure headers, static file serving (`static/*`), a `/healthy` check, and a `/ws/*` WebSocket upgrade route. It mounts all versioned routes under `/api` via `v1Routes`.

`src/v1/api/index.ts` chains global middleware in a specific, load-bearing order — later route groups depend on context set by earlier middleware:

1. `authRoutes` (no auth required — signup/sign-in/logout)
2. `checkSessionUser` — resolves the session cookie to a user, sets `user`/`session` in context
3. `usersRoutes`
4. `checkUserActiveOrganization` — reads the active-organization header, loads the caller's `OrganizationMember`, sets it in context
5. `organizationsRoutes`, `workspacesRoutes`
6. `checkUserActiveWorkspace` — reads the active-workspace header, resolves the caller's workspace role (org owners are auto-promoted to workspace `admin`), sets it in context
7. `projectsRoutes`, `tasksRoutes`, `tagsRoutes`, `boardsRoutes`

A route group placed before a given middleware in this file cannot rely on the context that middleware sets. Centralized `onError` at the bottom dispatches on error type: `ZodError`, `NotFoundError` (`utils/NotFound.ts`), `DrizzleQueryError`, else falls through to a generic internal error handler.

### Authentication

Cookie-based session auth, no JWT (`routes/auth/auth.ts`, `services/sessionsService.ts`). Passwords are hashed with Argon2id; session tokens are a random 32-byte value, SHA-256-hashed before being stored — only the hash ever touches the `sessions` table, and lookups query against the hash. Sessions have a sliding lifetime: `checkSessionUser` refreshes `expiresAt` (pushing it another day out) whenever a request lands within 5 minutes of expiry; an idle session still expires outright. `SessionsService.deleteExpiredSessions` exists but nothing calls it yet — there's no cron sweeping expired rows.

### Authorization model

Two independent, additive role systems:
- **Organization roles**: `owner` / `admin` / `member` (`utils/organizationPermissions.ts`) — `member` has no permissions at all; all real capability comes from `owner`/`admin`
- **Workspace roles**: `admin` / `member` (`utils/workspacePermissions.ts`) — `member` does have a real, reduced permission set here

Each defines a permission string list (e.g. `"task:update"`, `"organization_member:delete"`). Route handlers gate access with the `checkUserPermission({ type, rolePermission })` middleware, where `type` is `"organization"` (org role only — used even for some workspace-scoped mutations, e.g. workspace membership management, so a plain workspace `admin` can't add/remove members of their own workspace), `"workspace"` (workspace role only), or `"organizationAndWorkspace"` (passes if *either* role grants the permission — the common case for project/task/tag/board routes, and how org owners/admins get access to workspace-scoped resources without an explicit workspace membership row).

`checkUserPermission` only answers "can this role in general do X" — it doesn't check resource-level visibility (e.g. whether the caller is a member of *this* project). That's a service-layer concern; see below.

Session/role context is threaded through Hono's `c.var` using typed getter/setter pairs (`getContextUser`/`setContextUser` in `sessionUserContext.ts`, and analogous helpers in `userActiveOrganization.ts` / `userActiveWorkspace.ts`). Getters throw if called before the corresponding middleware has run — this is how a handler wired into the pipeline in the wrong order fails fast.

### Route/service/schema layering

Each domain has three parallel files:
- `src/v1/api/routes/<domain>/<domain>.ts` — Hono handlers: parse input with the Zod schema from `db/schemas`, enforce permissions, call the service, shape the JSON response
- `src/v1/api/services/<domain>Service.ts` — a class taking a `DBExecuter` (either the pooled `db` or an open transaction — see `db/connect.ts`) in its constructor; owns all Drizzle queries for that domain
- `src/v1/db/schemas/<domain>.ts` — Drizzle table definition plus `drizzle-zod`-derived insert/select/update schemas used directly by routes for validation

Services accept a `DBExecuter` rather than importing the singleton `db` directly, which is what allows a caller to pass an open transaction through and compose multiple services within one transaction.

Cross-cutting concerns (e.g. `TasksService.getTasks` joining through `organizationMembers`/`projectMembers` to enforce visibility) are done in the service layer, not in middleware — middleware only establishes org/workspace-level identity and role, not resource-level visibility.

### Events and WebSockets

`utils/eventBus.ts` is a bare `node:events` `EventEmitter` singleton. A mutation handler calls an activity service (e.g. `ProjectActivityService.createProjectActivity`) which inserts an activity row and returns `{ type, projectId, meta }` (see `projectActivitiesMeta.ts` / `workspaceActivitiesMeta.ts` for the action-type shapes — `created`/`updated`/`deleted`/`member_added`/`member_removed`; for `"updated"` it diffs old vs. new and returns `undefined`, skipping the insert, if nothing actually changed). The route then does `if (activity) eventBus.emit(activity.type, activity)`. `registerAppEvents.ts` / `registerProjectEvents.ts` subscribe to those event names at startup and rebroadcast to connected clients via `WsConnectionsManager`/`WebSocketManager` (`src/v1/services/`), scoped to a project's room.

**Only project-level real-time is actually wired today.** `WebSocketManager`'s `/ws/*` upgrade reads a `RoomType` namespace (`organization` / `workspace` / `project` / `chat`), but `onMessage` only has a `"project"` case — the other three accept a connection but process nothing. Likewise, only `routes/projects/projects.ts` calls `eventBus.emit`; `WorkspaceActivityService` and task activities (`task_activities` table) persist rows in the same shape but nothing emits them onto `eventBus`, so workspace- and task-level changes don't yet broadcast. Room joining is also not permission-checked — any connection that knows a `projectId` can join its room.

This is the mechanism for live updates — if you add a new mutation that should push to connected clients, emit on `eventBus` rather than writing directly to the socket layer, and expect to also need to (a) add real `onMessage` handling for that room type if it isn't `"project"`, and (b) wire a subscriber for the new event name.

### Error handling

Don't throw raw errors from handlers for expected failure cases (not-found, forbidden) — either return a JSON error via `getApiErrorShape` (see existing handlers for the pattern) or throw `NotFoundError` and let the centralized `onError` in `src/v1/api/index.ts` render it. Drizzle query errors and Zod validation errors are already normalized centrally; don't duplicate that handling in individual routes.
