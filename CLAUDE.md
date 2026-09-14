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

Hono API server on Bun, backed by Postgres via Drizzle ORM. Domain model is a four-level hierarchy (see `docs/STRUCTURE.md` for full details):

```
Organization -> Workspace -> Project -> Task
```

Every resource belongs to exactly one parent, and permissions get more specific the deeper you go. Membership exists independently at the organization, workspace, and project levels.

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

### Authorization model

Two independent, additive role systems:
- **Organization roles**: `owner` / `admin` / `member` (`utils/organizationPermissions.ts`)
- **Workspace roles**: `admin` / `member` (`utils/workspacePermissions.ts`)

Each defines a permission string list (e.g. `"task:update"`, `"organization_member:delete"`). Route handlers gate access with the `checkUserPermission({ type, rolePermission })` middleware, where `type` is `"organization"`, `"workspace"`, or `"organizationAndWorkspace"` (passes if *either* role grants the permission — this is how org owners/admins get access to workspace-scoped resources without an explicit workspace membership row).

Session/role context is threaded through Hono's `c.var` using typed getter/setter pairs (`getContextUser`/`setContextUser` in `sessionUserContext.ts`, and analogous helpers in `userActiveOrganization.ts` / `userActiveWorkspace.ts`). Getters throw if called before the corresponding middleware has run — this is how a handler wired into the pipeline in the wrong order fails fast.

### Route/service/schema layering

Each domain has three parallel files:
- `src/v1/api/routes/<domain>/<domain>.ts` — Hono handlers: parse input with the Zod schema from `db/schemas`, enforce permissions, call the service, shape the JSON response
- `src/v1/api/services/<domain>Service.ts` — a class taking a `DBExecuter` (either the pooled `db` or an open transaction — see `db/connect.ts`) in its constructor; owns all Drizzle queries for that domain
- `src/v1/db/schemas/<domain>.ts` — Drizzle table definition plus `drizzle-zod`-derived insert/select/update schemas used directly by routes for validation

Services accept a `DBExecuter` rather than importing the singleton `db` directly, which is what allows a caller to pass an open transaction through and compose multiple services within one transaction.

Cross-cutting concerns (e.g. `TasksService.getTasks` joining through `organizationMembers`/`projectMembers` to enforce visibility) are done in the service layer, not in middleware — middleware only establishes org/workspace-level identity and role, not resource-level visibility.

### Events and WebSockets

`utils/eventBus.ts` is a bare `node:events` `EventEmitter` singleton. Services emit domain events (see `projectActivitiesMeta.ts` / `workspaceActivitiesMeta.ts` for the action-type shapes); `registerAppEvents.ts` / `registerProjectEvents.ts` subscribe to them at startup and rebroadcast to connected clients via `WsConnectionsManager`/`WebSocketManager` (`src/v1/services/`), scoped to a project's room. This is the mechanism for live updates — if you add a new mutation that should push to connected clients, emit on `eventBus` rather than writing directly to the socket layer.

### Error handling

Don't throw raw errors from handlers for expected failure cases (not-found, forbidden) — either return a JSON error via `getApiErrorShape` (see existing handlers for the pattern) or throw `NotFoundError` and let the centralized `onError` in `src/v1/api/index.ts` render it. Drizzle query errors and Zod validation errors are already normalized centrally; don't duplicate that handling in individual routes.
