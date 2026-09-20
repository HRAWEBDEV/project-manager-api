# Logging

Logging in this codebase is split across two unrelated mechanisms: a structured, per-request **pino** logger for HTTP traffic, and plain **`console.*`** calls for everything outside the request lifecycle (process startup/shutdown, DB connectivity, and — notably — the central API error handler). This document describes both, since the split is easy to miss and matters if you're trying to correlate an error with the request that caused it.

## Structured request logging (pino)

`index.ts` creates one root logger:

```ts
const rootLogger = pino({ transport: { target: "pino-pretty" } });
```

This uses the human-readable `pino-pretty` transport **unconditionally** — there's no `NODE_ENV` branch to switch to raw JSON output in production. If you need machine-parseable log output for a log aggregator, this is the place to change it.

The root logger is handed to `@hono/structured-logger`'s `structuredLogger` middleware:

```ts
app.use(requestId());
app.use(structuredLogger({
  createLogger: (c) => rootLogger.child({ requestId: c.var.requestId }),
}));
```

**Order matters here**: `requestId()` must run first because `createLogger` reads `c.var.requestId` — swapping these two lines would make every request-scoped log line lose its correlation ID. `structuredLogger` creates one pino [child logger](https://getpino.io/#/docs/child-loggers) per request (tagged with that request's ID) and stores it on context as `logger`, plus — since no `onRequest`/`onResponse`/`onError` overrides are passed — applies its library defaults: log method + path at request start, log status + elapsed ms at request end, and log an error at `error` level if one escapes the handler.

### Using the request logger

Any route or middleware that runs after this setup can log through the request-scoped logger via `c.var.logger` (typed as `Logger` from `pino` in `WithSessionUserVariables`, `utils/sessionUserContext.ts`), rather than importing `pino` or the root logger directly — this is what keeps every log line tagged with the originating request's ID. Current usage is sparse and identity-focused:

- `checkSessionUser` logs an `info` line identifying the resolved user on every authenticated request.
- The sign-in handler (`auth.ts`) logs an `info` line on successful sign-in.

Both log the user's id, username, and full name at `info` level — worth keeping in mind if log output ever leaves a trusted environment, since this is PII flowing into logs by default rather than being redacted or gated to `debug`.

## Everything outside a request: plain `console.*`

Process-lifecycle and infrastructure logging bypasses pino entirely and goes straight to `console.log`/`console.warn` in `index.ts` and `src/v1/db/connect.ts`:

- `PORT is not defined` warning at boot (`console.warn`)
- App start/stop messages, and failures during either (`console.log`)
- Database connectivity failures in `connectionOK()` (`console.log`)

These have no request context to attach to (they happen outside any HTTP request), so using `console` here rather than a pino child logger is reasonable — there's no requestId to tag them with.

## The central error handler logs via `console`, not pino

`v1Routes.onError` (`src/v1/api/index.ts`) — the single place `ZodError` / `NotFoundError` / `DrizzleQueryError` / generic errors are normalized into responses (see [`overview.md`](./overview.md#error-handling)) — starts with:

```ts
v1Routes.onError((err, c) => {
  console.log(err);
  // ...dispatch to handleZodError / handleNotFoundError / handleDbError / handleInternalError
});
```

This means **every handled API error is logged via plain `console.log`, not the request-scoped pino logger** — so an error log line for a given request isn't tagged with that request's ID the way a normal `info`/`error` line from `c.var.logger` would be, and it bypasses whatever transport/formatting pino is configured with. It also means `structuredLogger`'s own default `onError` callback effectively never fires for errors coming out of routes under `/api/v1` — because `v1Routes.onError` catches the error and returns a JSON response before it can propagate back up to the root app's middleware, the root app's `structuredLogger` sees a normal completed response (logged via its `onResponse` default), not an error.

If you need error logs correlated by request ID, the fix is to log through `c.var.logger.error(err)` inside `v1Routes.onError` instead of `console.log(err)`.

## Practical guidance

- Inside a route handler or middleware that runs after `checkSessionUser`/`structuredLogger`: use `c.var.logger` so the line carries the request ID.
- Outside the request lifecycle (startup, shutdown, DB pool events): `console.*` is what's already used and is fine, since there's no request to correlate against.
- Don't assume the central `onError` path gives you request-ID-correlated error logs today — it currently doesn't (see above).
