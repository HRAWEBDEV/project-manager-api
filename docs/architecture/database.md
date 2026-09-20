# Database

PostgreSQL is the only datastore, accessed exclusively through **Drizzle ORM** (`drizzle-orm/node-postgres`). This document covers the connection setup, schema/migration workflow, table layout, and the conventions repeated across every schema file. For how routes and services consume this layer, see [`overview.md`](./overview.md#route--service--schema-layering).

## Connection

`src/v1/db/connect.ts` creates a single `pg.Pool` (max 20 connections) from `DATABASE_URL` — the module **throws at import time** if that env var is unset, which is why it must be set before the app can even start. Drizzle wraps the pool with `casing: "snake_case"`, so schema fields are written in camelCase (`organizationId`) and Drizzle maps them to snake_case columns (`organization_id`) automatically — column names rarely need to be spelled out by hand.

`db` (the pooled instance) is the default executor. `DBExecuter` is a union of `typeof db` and an open `PgTransaction`, and every service is constructed with a `DBExecuter` rather than importing `db` directly — see [`overview.md`](./overview.md#route--service--schema-layering) for why (it's what lets a route compose several services inside one `db.transaction(...)`). `connectionOK()` runs a `SELECT 1` at startup to fail fast if Postgres is unreachable, and `closeConnection()` drains the pool on shutdown.

## Schema & migrations (Drizzle Kit)

- Schema files live in `src/v1/db/schemas/*.ts`, one file per table (`drizzle.config.ts` points `schema` at this directory, `schemaFilter: ["public"]`).
- `bun run db:generate` diffs the schema files against the last migration and writes a new SQL migration under `drizzle/` (plus a `drizzle/meta/_journal.json` entry).
- `bun run db:migrate` applies pending migrations to `DATABASE_URL`.
- `bun run open:studio` launches Drizzle Studio for browsing/editing data directly.

There is currently one migration, `0000_sudden_the_hand.sql` — the schema files are the source of truth; never hand-edit a generated migration or the database directly.

**Seeding**: `bun run db:seed` is wired to run `src/db/v1/seed.ts`, but no such file exists in the repo yet — treat seeding as not yet implemented rather than assuming the script works.

## Schema conventions

A few patterns repeat across nearly every table:

- **UUID primary keys** — `uuid("id").defaultRandom().primaryKey()` everywhere; no serial/integer IDs.
- **`trackChanges`** (`src/v1/db/utils/trackChanges.ts`) — a shared `{ createdAt, updatedAt }` pair spread into most tables (`...trackChanges`). `updatedAt` uses Drizzle's `$onUpdate(() => new Date())` so application code never has to set it manually on updates.
- **`drizzle-zod` schemas alongside the table** — most schema files export `select`/`insert`/`update` Zod schemas derived directly from the Drizzle table (`createSelectSchema` / `createInsertSchema` / `createUpdateSchema`), which is what route handlers import to validate request bodies (see [`overview.md`](./overview.md#route--service--schema-layering)). Coverage isn't perfectly uniform — e.g. `tasksChecklists.ts` and `taskTags.ts` don't export an update schema — so check the specific file rather than assuming all three always exist.
- **Compound `unique()` constraints** used as the mechanism for preventing duplicate rows, e.g. one organization membership per `(organizationId, userId)`, one workspace membership per `(organizationMemberId, workspaceId)`, one tag name per workspace, one board name/position per project. These constraints are the actual duplicate-prevention mechanism — not application-level checks.
- **`onDelete` is deliberate, not uniform.** `cascade` is used going *down* the hierarchy (deleting an organization cascades to its workspaces, workspace members, invitations, etc.; deleting a project cascades to its tasks; deleting a task cascades to its assignees/checklists). `set null` is used for "who did this" references where the record should outlive the actor (`projects.createdBy`, `workspaces.createdBy`, `*.addedBy`, `tasks.createdBy`). A handful of foreign keys (`boards.projectId`, `tags.workspaceId`, `taskApprovers.taskId`/`organizationMemberId`, `taskTags.taskId`/`tagId`) don't specify `onDelete` at all, which means Postgres's default (`NO ACTION`) applies — deleting a referenced row is blocked unless the app deletes the dependents first.

## Table layout

**Core hierarchy** (see [`overview.md`](./overview.md) for the conceptual model): `organizations` → `workspaces` → `projects` → `tasks`, each with a parallel `*Members` join table (`organizationMembers`, `workspaceMembers`, `projectMembers`) linking `users`/`organizationMembers` to that level with a role (where applicable) and a `joinedAt`/`addedBy` audit trail.

**Auth**: `users`, `sessions` (opaque hashed session tokens — see [`authentication.md`](./authentication.md)), `organizationInvitations` (status enum: `pending`/`accepted`/`declined`, unique per `(organizationId, email)`).

**Task detail tables**, all keyed off `tasks.id`: `taskAssignees` (unique per `(taskId, organizationMemberId)`, tracks `completedAt` per assignee), `taskApprovers` (unique per `(organizationMemberId, taskId)`, `approved` boolean + `approvedAt`), `tasksChecklists` (ordered via `sortNo`), `taskTags` (join table to `tags`, unique per `(taskId, tagId)`). `tasks.parentTaskId` is a **self-referencing** foreign key (named `tasks_parent_task_id_fkey`) used for subtasks.

**Workspace-scoped resources**: `tags` (unique name per workspace), `boards` (kanban boards, project-scoped, unique per `(projectId, name)` and per `(projectId, position)` for ordering).

**Activity logs**: `projectActivities`, `workspaceActivities`, `taskActivities` — each has an `activityType` enum (`created`/`updated`/`deleted`, plus `member_added`/`member_removed` on the project/workspace variants) and a `metadata` `jsonb` column for event-specific payload. Notably, their `projectId`/`workspaceId`/`taskId` columns are **plain `uuid`, not foreign keys** — only the `organizationMembersId` (the actor) is FK-constrained. These are what `eventBus`-driven real-time updates are built from (see [`overview.md`](./overview.md#events-and-real-time-updates)).

## Role enums live in the schema, not just in code

`organizationMembers.role` and `workspaceMembers.role` are Postgres enums (`organization_roles`: `owner`/`admin`/`member`; `workspace_roles`: `admin`/`member`), matching the TypeScript role unions in `utils/organizationPermissions.ts` / `utils/workspacePermissions.ts` (see [`authorization.md`](./authorization.md)). Adding a new role means updating both the enum (via a migration) and the corresponding permissions map — they aren't derived from each other.
