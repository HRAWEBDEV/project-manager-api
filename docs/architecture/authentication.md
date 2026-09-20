# Authentication

Authentication is cookie-based session auth — there is no JWT. A signed-in client holds an opaque session token in a cookie; every request re-resolves that token to a user via `checkSessionUser`. This document covers the auth routes, the session token lifecycle, password storage, and how session identity flows into request context. For how that identity is then scoped to an organization/workspace/role, see [`overview.md`](./overview.md).

## Routes (`src/v1/api/routes/auth/auth.ts`)

These are the only routes mounted **before** `checkSessionUser` in `src/v1/api/index.ts` — they don't require an existing session.

- `POST /api/v1/auth/sign-up` — creates a user *and* its first organization in one operation (`AccountServices.createAccount`), then a session, then sets the session cookie. Signup is intentionally all-or-nothing: a user never exists without at least one organization.
- `POST /api/v1/auth/sign-in` — validates username/password (`UsersService.signInUserWithUsernamePassword`). If the request already carries a session cookie, that session is revoked first (`sessionService.revokeSession`) before a new one is created — so signing in from a browser that already had a stale session doesn't leave two live sessions for that cookie.
- `POST /api/v1/auth/logout` — revokes the session referenced by the current cookie and deletes the cookie. No-ops safely if there is no cookie.

All three read/write the session cookie through `sessionsService.ts`'s `setSessionCookie` / `getSessionCookie` / `deleteSessionCookie` helpers rather than touching `hono/cookie` directly, so the cookie name and options stay in one place.

## Password storage

Passwords are hashed with **Argon2id** (`argon2` package, `UsersService.hashPassword` / `verifyPassword` in `usersService.ts`). The raw password is never persisted — only `hashedPassword` on the `users` row. Verification happens once per sign-in call via `argon2.verify`; there's no separate password-reset flow in this codebase yet.

## Session tokens

`SessionsService` (`src/v1/api/services/sessionsService.ts`) treats the session token as a bearer secret and never stores it in plaintext:

1. `generateToken()` creates a random 32-byte value, hex-encoded (`crypto.randomBytes`).
2. `hashToken()` SHA-256-hashes it before it touches the database.
3. The **raw** token is what's set in the cookie (`setSessionCookie`); the **hashed** token is what's stored in the `sessions` table and what every lookup (`getSessionUser`, `revokeSession`, etc.) queries against.

This means a leaked database row doesn't hand out usable session tokens — only their hashes.

Each session row also carries `ipAddress` and `userAgent` (captured via `getUserIpAddress` / `getUserAgent` at sign-up/sign-in time) and an `expiresAt` set to **1 day** from creation (`SessionsService.SESSION_EXPIRE_MS`). Sessions are looked up with `getSessionUser`, which joins `sessions` to `users` on a matching, non-expired token.

`SessionsService` also exposes `validateSession`, `refreshSession`, and `deleteExpiredSessions`, but none of these are currently called by any route or middleware — sessions are fixed-lifetime today (they expire outright after one day) rather than sliding on activity, and there's no cron/job wired up yet to sweep expired rows.

## Resolving a session on each request

`checkSessionUser` (`src/v1/api/middlewares/checkSessionUser.ts`) is the first identity-resolving middleware in the pipeline (see [`overview.md`](./overview.md#request-pipeline)) and runs on every route mounted after it:

1. Read the session cookie. Missing cookie → `401 Unauthorized`.
2. Look up the session + user via `SessionsService.getSessionUser(token)`. No match (revoked, wrong token, or expired — the join in `getSessionUser` only returns rows where the hash matches) → `401 Unauthorized`.
3. On success, store the resolved `user` and `session` in request context via `setContextUser` / `setContextSession` (`utils/sessionUserContext.ts`).

Downstream handlers read that identity with `getContextUser(c)` / `getContextSession(c)`. Both getters **throw** if called before `checkSessionUser` has run, rather than returning `undefined` — this is deliberate: a handler that's accidentally reachable without authentication fails loudly instead of leaking `undefined`-shaped data. The same pattern is reused one level up for organization/workspace identity (`getContextUserOrganizationMember`, `getContextUserWorkspaceRole`), so authentication, organization membership, and workspace role are each a separate, independently-enforced context layer.
