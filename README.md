# Project Manager API

A REST + WebSocket API for managing organizations, workspaces, projects, and tasks. Built with [Hono](https://hono.dev) on the [Bun](https://bun.sh) runtime, backed by PostgreSQL via [Drizzle ORM](https://orm.drizzle.team). The domain model follows a four-level hierarchy — `Organization → Workspace → Project → Task` — with two independent, additive role systems (organization roles and workspace roles) governing access at every level. See the [`CHANGELOG.md`](./CHANGELOG.md) for the complete endpoint history.

## Features

- **Auth & sessions** — signup (with automatic organization creation), sign-in, logout, cookie-based sessions, Argon2 password hashing, session metadata (IP, user agent)
- **Users** — profile info, organization list, avatar upload, invitation inbox (view/accept/decline)
- **Organizations** — name/logo management, invitations, member management with an owner/admin/member role system
- **Workspaces** — full CRUD, member management with an admin/member role system, creator auto-assigned as admin
- **Projects** — full CRUD, icon upload, member management, archiving, color/icon customization
- **Tasks** — full CRUD, assignees, checklists, tags, subtasks (via parent references), date ranges, approvers with approve/reject flow, filtering by project and assignee
- **Tags & Boards** — workspace-scoped tags and project-scoped kanban boards with position-based ordering
- **Authorization** — permission-string based RBAC (`checkUserPermission` middleware) combining organization and workspace roles, with org owners/admins automatically granted access to workspace-scoped resources
- **Activity tracking** — workspace and project activity logs for create/update/delete operations
- **Real-time updates** — WebSocket connections (`/ws/*`) scoped to project "rooms", driven by an internal event bus so mutations push live updates to connected clients
- **Infrastructure** — request ID tracking, structured logging (pino), CORS, secure headers, static file serving for uploaded images, a `/healthy` check, and graceful shutdown on SIGINT/SIGTERM

## Requirements

- [Bun](https://bun.sh) (this project uses Bun exclusively — do not use `npm`/`npx`)
- PostgreSQL (any recent version reachable via a connection string)

## Installation

```bash
git clone <repository-url>
cd project-manager-api
bun install
```

Then set up your environment variables (below) and run the database migrations before starting the server.

## Environment

Create a `.env` file in the project root with:

| Variable       | Required | Description                                                               |
| -------------- | -------- | ------------------------------------------------------------------------- |
| `DATABASE_URL` | Yes      | PostgreSQL connection string. The app throws at import time if unset.     |
| `PORT`         | No       | Port the server listens on. Defaults to `8080` (with a warning) if unset. |

## Development

```bash
bun run dev            # start the dev server in watch mode (NODE_ENV=development)
bun run typecheck      # type-check with tsc --noEmit — the correctness gate (no test suite)
bun run db:generate    # generate a Drizzle migration from schema changes in src/v1/db/schemas
bun run db:migrate     # apply pending migrations
bun run db:seed        # seed the database
bun run open:studio    # launch Drizzle Studio to browse/edit data
```

Run `bun run db:generate` and `bun run db:migrate` after pulling changes that touch `src/v1/db/schemas`. Use `bun run typecheck` before committing, since there is no test suite in this repo.
