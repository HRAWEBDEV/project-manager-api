# Organizations API

Base path: `/api/v1/organizations` (source: `src/v1/api/routes/organizations/organizations.ts`).

Every route in this file requires a session cookie and an `organization-id` header (no `workspace-id` header — see [`overview.md`](./overview.md#what-every-route-needs)). All permission checks use `type: "organization"` — i.e. only the caller's **organization** role matters here, never their workspace role (see [`../architecture/authorization.md`](../architecture/authorization.md)).

## `PATCH /organizations`

Update the active organization's `name` and/or `description`.

- **Permission**: `organization:update` (org `owner`/`admin` only)
- **Body**: `{ name?: string, description?: string }` — validated against `updateOrganizationSchema.pick({ name, description })` (`db/schemas/organizations.ts`)
- **Response `200`**: `{ id: string }` (the updated organization's id — `OrganizationsService.updateOrganization` only returns `id`, not the full row)
- **Behavior**: if `name` changes and differs from the current name, the organization's `slug` is silently regenerated (`slugify(name) + "_" + nanoid(8)`) — the caller never sets `slug` directly.

## `POST /organizations/logo`

Upload/replace the organization's logo.

- **Permission**: `organization:update`
- **Body**: `multipart/form-data` with an `image` file field (parsed via `c.req.parseBody()`). Non-file `image` → `400` `"Image is not a file"`.
- **Constraints** (`utils/staticImagesService.ts`): allowed types `image/jpeg`, `image/png`, `image/webp`; max size 5 MB. Violations → `400` with the specific message (`InvalidImageTypeError` / `ImageTooLargeError`).
- **Storage**: saved to disk under `static/images/organizations/logo/<uuid><ext>` and served back at `/static/images/organizations/logo/<uuid><ext>` (static file serving is set up in `index.ts`). The old logo file is **not** deleted when replaced — only `DELETE /logo` removes a stored file.
- **Response `200`**: `{ message: "logo updated successfully", avatarUrl: string, userId: string | null }` — note the field is named `avatarUrl` even though this is an organization logo, and `userId` here is actually the **organization id** returned by `updateOrganization` (the service's return shape is `{ id }`, reused across user/org update handlers).

## `DELETE /organizations/logo`

Remove the organization's logo.

- **Permission**: `organization:update`
- **Behavior**: looks up the organization first — not found → `404` `"Organization not found"`. If the organization currently has no `logo` set, returns success immediately without touching anything (`{ message: "logo removed successfully" }`, no `organizationId` field). Otherwise deletes the file from disk (missing file on disk is tolerated — `ENOENT` is swallowed) and clears `logo` to `""` in the database.
- **Response `200`**: `{ message: "logo removed successfully", organizationId: string }` (only present when a logo actually existed).

## `GET /organizations/invitations`

List pending/past invitations sent **from** the active organization.

- **Permission**: `organization_invitation:read`
- **Response `200`**: `{ invitations: Array<{ id, organizationId, organizationName, userId, userName, userLastName, email, status, expiresAt, acceptedAt, createAt }> }`. **`userId`/`userName`/`userLastName` here identify the inviter** (the org member who sent the invite), not the invitee — see the note below on how `organizationInvitations.userId` is used.
- Filtered only by `organizationId` — every invitation ever sent by this organization is returned regardless of `status` (`pending`/`accepted`/`declined`), with no pagination.

## `POST /organizations/invitations`

Invite a user to the active organization by email.

- **Permission**: `organization_invitation:create` (org `owner`/`admin`)
- **Body**: `{ email: string }` — validated against `insertInvitationSchema.pick({ email: true })`
- **Behavior**: `organizationInvitations.userId` is set to the **inviting** user's id, not the invitee's — the invitee is identified purely by `email` (there's no lookup requiring the email to belong to an existing user at invite time; matching to a real account happens later, by email, when that account's owner checks `GET /users/me/invitations`). `expiresAt` is set to 7 days from now. There's a unique constraint on `(organizationId, email)`: re-inviting the same email to the same org **upserts** — resets `status` to `"pending"`, clears `acceptedAt`, and extends `expiresAt`, rather than erroring or creating a duplicate row.
- **Response `200`**: `{ id: string }` (the invitation id).

## `GET /organizations/members`

List every member of the active organization.

- **Permission**: `organization_member:read`
- **Response `200`**: `{ members: Array<{ id, organizationId, role, joinedAt, addedBy, organizationName, username, userAvatar, userFirstName, userLastName, userEmail, userPhoneNumber }> }`, ordered by `joinedAt`. No pagination.

## `PATCH /organizations/members/:id`

Change an organization member's role.

- **Permission**: `organization_member:update`. Only org `owner` has this permission — org `admin`'s permission list includes `organization_member:read` but not `:update`, so in practice this route is **owner-only**; an admin is rejected with `403` before the handler runs.
- **Body**: `{ role: "admin" | "member" }` (validated against `selectOrganizationMemberSchema.pick({ role: true })`). Setting `role: "owner"` is explicitly rejected at the route level with `400` `"Can not set organization member role to owner"` — there is no API path to transfer/grant ownership.
- **Behavior**: `OrganizationMembersService.updateOrganizationMemberRole` additionally guards the update by the caller's own role — if the caller is `owner`, the target row must not already be `owner`; if the caller is `admin`, the target must not already be `owner` or `admin`. Since only owners can reach this route today (see above), the `admin`-caller branch of this guard is currently unreachable through the API. **If the guard blocks the update (or the member id simply doesn't exist), the response is identical either way** — `404` `"Organization member not found"` — so a caller can't distinguish "no such member" from "not allowed to change that member's role."
- **Response `200`** (success): `{ id: string, role: "admin" | "member" }`.

## `DELETE /organizations/members/:id`

Remove a member from the active organization.

- **Permission**: `organization_member:delete` — again only `owner` holds this permission in `organizationPermissions.ts`, so this route is effectively owner-only in practice.
- **Behavior**: same role-guard pattern as the update route (`OrganizationMembersService.deleteOrganizationMember`) — an owner can delete anyone except another owner; the dead `admin`-caller branch mirrors the update route. A blocked deletion and a nonexistent member id both surface as `404` `"Organization member not found"`.
- **Response `200`** (success): `{ id: string }`.
- Note: `workspaceMembers.organizationMemberId` and `projectMembers.organizationMemberId` both reference `organizationMembers.id` with `onDelete: "cascade"`, so removing a member here also deletes their workspace- and project-level membership rows at the database level, even though this route only directly touches the `organization_members` table.
