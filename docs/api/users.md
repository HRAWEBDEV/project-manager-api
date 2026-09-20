# Users API

Base path: `/api/v1/users` (`src/v1/api/routes/users/users.ts`).

This route group is mounted after `checkSessionUser` but before `checkUserActiveOrganization` in `src/v1/api/index.ts` (see [`overview.md`](./overview.md#what-every-route-needs)). Every route below requires a valid session cookie; **none** require an `organization-id` or `workspace-id` header, and confirmed against the code — no handler in this file reads either header. These are self-service routes scoped to the caller (`getContextUser(c)`), and none of them use `checkUserPermission` — access control here is just "you must be signed in as yourself."

---

## `PATCH /users`

Update the caller's own profile fields.

- **Auth**: session only.
- **Body** (all optional, via `updateUserSchema.pick(...)` from `src/v1/db/schemas/users.ts`): `username`, `firstName`, `lastName`, `email`, `phoneNumber`.
- **Response `200`**: `{ id: string }` — `UsersService.updateUser` only returns the id of the updated row, not the full user object.
- **Errors**: a `username`/`email`/`phoneNumber` collision violates a unique constraint on the `users` table and surfaces as a `DrizzleQueryError`, normalized centrally (see [`overview.md`](./overview.md#error-shape)).

## `GET /users/info`

Get the caller's own profile plus one organization.

- **Auth**: session only.
- **Response `200`**: `{ user: <User without hashedPassword>, organization: Organization | null }`. `UsersService.getUserInfo` left-joins `organizationMembers`/`organizations` and returns only the **first** matching row — if the user belongs to multiple organizations, only one (whichever the join happens to return first) is included here. `hashedPassword` is explicitly stripped before the response is built.
- If the user row somehow doesn't exist, the service returns `null` and the route returns `null` as the JSON body (not a `404`).

## `GET /users/organizations`

List every organization the caller belongs to.

- **Auth**: session only.
- **Response `200`**: `{ organizations: Array<{ id, name, logo, slug, description, createdAt, updatedAt, userRole }> }`. `userRole` is the caller's `organizationMembers.role` for that org (`owner`/`admin`/`member`) — see [`../architecture/authorization.md`](../architecture/authorization.md).

## `POST /users/avatar`

Upload/replace the caller's avatar image.

- **Auth**: session only.
- **Body**: `multipart/form-data` with an `image` field. Parsed with Hono's `c.req.parseBody()`; if `image` isn't a `File`, returns `400` (`"Image is not a file"`).
- **Validation** (`UserAvatarService` → `StaticImagesService`, `src/v1/api/utils/staticImagesService.ts`): allowed types `image/jpeg`, `image/png`, `image/webp`; max size 5 MB. Violating either returns `400` with the specific error message (`InvalidImageTypeError` / `ImageTooLargeError`), rather than falling through to the generic error handler.
- **Storage**: the file is written to disk under `<cwd>/static/images/avatars/<uuid><ext>` and served back at `/static/images/avatars/<uuid><ext>` (static files are served from `index.ts`'s `serveStatic({ root: "./" })` on `static/*`). The old avatar file (if any) is deleted **after** the new one is saved and the DB row updated — so a failed old-file delete doesn't block the update.
- **Response `200`**: `{ message: "Avatar updated successfully", avatarUrl: "<origin>/static/images/avatars/<uuid><ext>", userId: string | null }` — `avatarUrl` is an absolute URL built from the request's own origin.

## `DELETE /users/avatar`

Remove the caller's avatar.

- **Auth**: session only.
- No-ops (still returns `200`) if the caller has no avatar set — the file delete and DB update only run `if (user.avatar)`.
- **Response `200`**: `{ message: "Avatar deleted successfully" }`.
- Deleting the file tolerates it already being gone (`ENOENT` is swallowed in `StaticImagesService.deleteStaticImage`); any other filesystem error propagates as a thrown error.

## `GET /users/me/invitations`

List pending (and past) organization invitations addressed to the caller.

- **Auth**: session only.
- Matching is by **email**, not by a stored invitee id: `OrganizationInvitationsService.getUserInvitations` resolves the caller's email from their user id, then finds `organization_invitations` rows whose `email` column matches it.
- **Response `200`**: `{ invitations: Array<{ id, organizationId, organizationName, userId, userName, userLastName, email, status, expiresAt, acceptedAt, createAt }> }`. Note `userId`/`userName`/`userLastName` here identify the **inviter** (the `organization_invitations.userId` column is the id of the org member who sent the invite, joined against `users`), not the invitee — despite the field being named `userId`.

## `PATCH /users/me/invitations/:id`

Accept or decline a pending invitation.

- **Auth**: session only. No `checkUserPermission` — any signed-in caller can act on an invitation, but the update is scoped (see below) so it can only affect an invitation actually addressed to them.
- **Params**: `id` — the invitation id.
- **Body**: `{ status: "accepted" | "declined" }` (parsed via `selectInvitationSchema.pick({ status: true })`; the schema's full enum includes `"pending"`, but setting it back to `"pending"` yourself is not meaningful — see the `WHERE` clause below, which only matches invitations currently `"pending"`).
- **Behavior** (`db.transaction`, `OrganizationInvitationsService.updateInvitationStatus` + `OrganizationMembersService.createMember`):
  1. Updates the invitation row's `status`, but only if **all** of: `id` matches, the invitation's `email` matches the caller's own email, `expiresAt` is still in the future, and current `status` is `"pending"`. If none of that matches, the update affects zero rows and the route returns `undefined` as the JSON body (not a `404` or error).
  2. If the update succeeded **and** the new status is `"accepted"`, an `OrganizationMember` row is created for the caller in that organization, with `addedBy` set to the inviter's user id (the invitation's stored `userId`) and the default role (`"member"`).
  3. Declining just updates the status — no membership row is created or removed.
- **Response `200`**: the updated invitation subset `{ id, organizationId, status, userId }`, or `undefined` if the guarded update matched no row.
- A stale/expired/already-resolved invitation therefore fails **silently** (200 with `undefined` body) rather than with a `404`/`409` — worth knowing if you're building a client against this endpoint.
