# API Overview

All routes are versioned and mounted at `/api/v1` (`/api` from `index.ts`'s `basePath`, `/v1` from `src/v1/api/index.ts`'s `basePath`) — e.g. the tasks list endpoint is `GET /api/v1/tasks`. Every per-domain doc in this directory gives paths relative to `/api/v1` unless stated otherwise.

For the concepts referenced throughout these docs, see:

- [`../architecture/overview.md`](../architecture/overview.md) — request pipeline, route/service/schema layering
- [`../architecture/authentication.md`](../architecture/authentication.md) — session cookie mechanics
- [`../architecture/authorization.md`](../architecture/authorization.md) — organization/workspace roles and the `checkUserPermission` model
- [`../architecture/realtime.md`](../architecture/realtime.md) — which mutations push WebSocket updates

## What every route needs

Every route group sits at a specific point in the middleware chain built in `src/v1/api/index.ts`, and that position determines what a caller must supply:

| Route group | Session cookie | `organization-id` header | `workspace-id` header |
|---|---|---|---|
| `auth` (`/auth/*`) | Not required (these routes establish the session) | No | No |
| `users` (`/users/*`) | Required | No | No |
| `organizations` (`/organizations/*`) | Required | Required | No |
| `workspaces` (`/workspaces/*`) | Required | Required | No |
| `projects` (`/projects/*`) | Required | Required | Required |
| `tasks` (`/tasks/*`) | Required | Required | Required |
| `tags` (`/tags/*`) | Required | Required | Required |
| `boards` (`/boards/*`) | Required | Required | Required |

- **Session cookie** — set by `/auth/sign-in` or `/auth/sign-up`; resolved by `checkSessionUser`. Missing/invalid → `401`.
- **`organization-id` header** — which organization the request acts within; resolved by `checkUserActiveOrganization` into the caller's `OrganizationMember` row. Missing → `400`; caller isn't a member → `403`.
- **`workspace-id` header** — which workspace the request acts within; resolved by `checkUserActiveWorkspace` into the caller's effective workspace role (organization owners are auto-promoted to workspace `admin` here without needing a membership row). Missing → `400`; caller isn't a member (and isn't an org owner) → `403`.

Beyond identity, most mutating (and some read) routes are additionally gated by `checkUserPermission({ type, rolePermission })` — see [`../architecture/authorization.md`](../architecture/authorization.md) for the full permission model. Each per-domain doc lists the exact permission required per route.

## Error shape

Expected failures (validation, not-found, forbidden) return a JSON body via `getApiErrorShape`:

```json
{ "status": "failed", "code": 403, "message": "Forbidden" }
```

`ZodError` and `DrizzleQueryError` are normalized centrally in `src/v1/api/index.ts`'s `onError` rather than per-route — see [`../architecture/overview.md#error-handling`](../architecture/overview.md#error-handling).

## Route domains

| Domain | Base path | Doc |
|---|---|---|
| Auth | `/auth` | [`auth.md`](./auth.md) |
| Users | `/users` | [`users.md`](./users.md) |
| Organizations | `/organizations` | [`organizations.md`](./organizations.md) |
| Workspaces | `/workspaces` | [`workspace.md`](./workspace.md) |
| Projects | `/projects` | [`projects.md`](./projects.md) |
| Tasks | `/tasks` | [`tasks.md`](./tasks.md) |
| Tags | `/tags` | [`tags.md`](./tags.md) |
| Boards | `/boards` | [`boards.md`](./boards.md) |
