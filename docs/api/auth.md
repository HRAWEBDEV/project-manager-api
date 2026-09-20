# Auth API

Source: `src/v1/api/routes/auth/auth.ts`. Base path: `/auth`, mounted before `checkSessionUser` in `src/v1/api/index.ts` — **none of these routes require an existing session cookie**. For the session/cookie mechanics referenced below (token hashing, expiry, context getters), see [`../architecture/authentication.md`](../architecture/authentication.md); for the request-needs table (auth/org/workspace headers), see [`overview.md`](./overview.md).

All three routes read/set the session cookie exclusively through `sessionsService.ts`'s `getSessionCookie` / `setSessionCookie` / `deleteSessionCookie` helpers.

## `POST /api/v1/auth/sign-up`

Creates a user and its first organization in one atomic operation (`AccountServices.createAccount`, run inside a single `db.transaction`), then a session, then sets the session cookie. The transaction also creates a default "public" workspace for the new organization and adds the user as a member of it — signup never leaves a user without an organization and a workspace.

**Request body**

```json
{
  "user": {
    "username": "string, required",
    "email": "string, required",
    "phoneNumber": "string, optional",
    "firstName": "string, required",
    "lastName": "string, required",
    "password": "string, required"
  },
  "organization": {
    "name": "string, required",
    "description": "string, optional"
  }
}
```

The handler first checks that both `user` and `organization` are present on the body at all (raw `if (!user || !organization)`, independent of Zod) before validating each sub-object with a `.pick()` of `insertUserSchema` / `insertOrganizationSchema` (from `db/schemas/users.ts` / `organizations.ts`) plus an appended `password: z.string()` on the user side. Field constraints come from the Drizzle column definitions: `username` ≤ 50 chars, `email` ≤ 255 chars, `phoneNumber` ≤ 20 chars, `firstName`/`lastName` ≤ 100 chars, organization `name` ≤ 100 chars. `username`, `email`, and (if provided) `phoneNumber` must be unique across all users — a collision surfaces as a `DrizzleQueryError` from the unique constraint, normalized by the central `onError`.

Inside the transaction, the user's password is hashed with Argon2id (`UsersService.createUser` → `hashPassword`) before being stored; the raw password is never persisted. The user is added to the new organization as its `owner` (`OrganizationMembersService.createMember`).

**Response** — `201 Created`

```json
{ "message": "User signed up successfully" }
```

The session cookie is set on the response (see [`../architecture/authentication.md#session-tokens`](../architecture/authentication.md#session-tokens) for what the cookie contains). The created user/organization/session records are not returned in the body — a client would call `GET /users/info` afterward to fetch them.

**Errors**

- `400 Bad Request` — `user` or `organization` missing from the body entirely: `{ "status": "failed", "code": 400, "message": "User and organization info are required" }`.
- A `ZodError` from either `.parse()` call (missing/invalid field, wrong type) is not caught locally — it propagates to the central `onError` in `src/v1/api/index.ts`, which normalizes it (see [`../architecture/overview.md#error-handling`](../architecture/overview.md#error-handling)).
- A `DrizzleQueryError` from a unique-constraint violation (duplicate `username`/`email`/`phoneNumber`) is likewise normalized centrally, not handled in this route.

## `POST /api/v1/auth/sign-in`

Validates a username/password pair and issues a new session.

**Request body**

```json
{ "username": "string, required", "password": "string, required" }
```

Validated via `insertUserSchema.extend({ password: z.string() }).pick({ username: true, password: true })`.

**Behavior**

1. `UsersService.signInUserWithUsernamePassword` looks up the user by `username` and verifies the password against the stored Argon2id hash. No matching user, or a wrong password, both fail identically (no username enumeration via the error message).
2. If the incoming request already carries a session cookie, that session is revoked (`SessionsService.revokeSession`) and the cookie is deleted **before** the new session is created — so signing in again from a client that already had a (possibly stale) session doesn't leave two live sessions tied to that cookie slot.
3. A new session is created (`SessionsService.createSession`, capturing the caller's IP and User-Agent) and its cookie is set.
4. An `info`-level log line is written via `c.var.logger` identifying the signed-in user (id, username, first/last name) — see [`../architecture/logging.md`](../architecture/logging.md) for the logging conventions this follows.

**Response** — `200 OK` (default status)

```json
{ "message": "User signed in successfully" }
```

**Errors**

- `401 Unauthorized` — user not found or password mismatch: `{ "status": "failed", "code": 401, "message": "Invalid username or password" }`.
- A `ZodError` for a missing/invalid `username` or `password` field propagates to the central `onError`.

## `POST /api/v1/auth/logout`

Registered in source as `authRoutes.post("logout", handleUserLogout)` (no leading slash) — Hono's path merging (`mergePath`) normalizes this to the same route as `"/logout"`, so the resulting path is `/api/v1/auth/logout` as expected; the missing slash has no effect on routing.

**Request body**: none.

**Behavior**: reads the session cookie if present; if there is one, revokes the corresponding session row (`SessionsService.revokeSession`) and deletes the cookie. If there is no cookie, this is a safe no-op — logout never requires an existing session.

**Response** — `200 OK`

```json
{ "message": "User logged out successfully" }
```

**Errors**: none specific to this route — it does not validate a body and does not fail when already logged out.
