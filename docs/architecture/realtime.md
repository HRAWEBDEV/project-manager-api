# Real-time updates

Live updates are delivered over a single WebSocket endpoint, fed by an in-process event bus that services emit onto after a mutation. This document covers the connection/room protocol, how a mutation becomes a broadcast, and what is and isn't wired up today. See [`overview.md`](./overview.md#events-and-real-time-updates) for how this fits into the rest of the request pipeline.

## Transport: one endpoint, Bun's native WebSocket support

`index.ts` upgrades any request to `/ws/*` via `hono/bun`'s `upgradeWebSocket`, delegating the handshake to `WebSocketManager.createConnection` (`src/v1/services/webSocketManager.ts`). There's no separate WS server or port — Bun's `serve({ fetch, websocket })` handles both HTTP and WebSocket traffic on the same listener.

The path segment after `/ws/` is read as a **namespace** (`RoomType`: `"organization" | "workspace" | "project" | "chat"`), e.g. connecting to `/ws/project` puts the connection in the `project` namespace. Each connection gets a random `connectionId` (`nanoid()`) and is registered in `WsConnectionsManager` with an empty `joinedRooms` map.

**Only the `project` namespace is actually handled today.** The `onMessage` handler switches on the namespace and only has a `"project"` case — connecting under `organization`, `workspace`, or `chat` accepts the socket but no message it sends will be processed. The `RoomType` union and `WsConnectionsManager`'s room-tracking API already support all four, but broadcasting is currently implemented only for projects.

## Joining a project room

Once connected on the `project` namespace, a client joins a specific project's room by sending:

```json
{ "type": "project.join", "projectId": "<uuid>" }
```

This is validated with a Zod schema inline in `onMessage`; anything that doesn't match (wrong shape, non-string frame) gets `{"type":"error","message":"invalid message"}` sent back. A valid join calls `connectionManager.joinProjectRoom(connectionId, projectId)`, which adds `projectId` to that connection's `project` room set. A connection can join multiple project rooms.

**There is no leave message.** `WsConnectionsManager.exitProjectRoom` exists but nothing calls it — the only way a connection stops receiving a project's broadcasts is to disconnect (`onClose` removes the connection entirely via `removeConnection`).

Authorization note: joining a room is **not permission-checked** against the caller's project membership — any connection that knows a `projectId` can join its room and receive its broadcasts. If a project can contain sensitive data, this is worth tightening before relying on it for access control.

## From mutation to broadcast

The pipeline from a write to a delivered WebSocket message:

1. A route's mutation handler calls an activity service (e.g. `ProjectActivityService.createProjectActivity`) to record what happened, passing an `ActivityAction` (`projectActivitiesMeta.ts`: `created` / `updated` / `deleted` / `member_added` / `member_removed`, each carrying whatever `meta` diff applies).
2. The activity service inserts a row into the activity table (e.g. `project_activities`) and returns `{ type, projectId, meta }`. For `"updated"`, it first diffs old vs. new (`generateUpdateProjectMeta`) — **if nothing actually changed, it returns `undefined` and skips the insert entirely**, so no-op updates produce no activity row and no broadcast.
3. If an activity was returned, the route calls `eventBus.emit(activity.type, activity)` — `eventBus` (`utils/eventBus.ts`) is a bare `node:events` `EventEmitter` singleton.
4. At startup, `registerAppEvents` → `registerProjectEvents` (`utils/registerProjectEvents.ts`) subscribes to each of the five event names on `eventBus` and, on receipt, calls `connectionManager.broadcastToProjectRoom(data.projectId, JSON.stringify(data))`.
5. `WsConnectionsManager.broadcastToProjectRoom` sends the JSON payload to every connection whose `project` room set contains that `projectId`.

```ts
// projects.ts, after a successful update
const activity = await projectActivityService.createProjectActivity({
  projectId, organizationMembersId: activeOrganizationMember.id,
  action: { type: "updated", meta: { oldProject, newProject } },
});
if (activity) eventBus.emit(activity.type, activity);
```

**Only `src/v1/api/routes/projects/projects.ts` actually emits onto `eventBus` today.** `WorkspaceActivityService` and the workspace equivalent of `projectActivitiesMeta.ts` (`workspaceActivitiesMeta.ts`) exist and follow the identical shape, and task activity has its own table (`task_activities`), but nothing in `workspaces.ts` or `tasks.ts` currently calls `eventBus.emit`. Their activity rows are persisted (visible via a future/other read path) but not broadcast — treat workspace- and task-level real-time updates as **not yet wired**, only project-level ones.

## Adding a new real-time mutation

Per [`overview.md`](./overview.md#events-and-real-time-updates): if a new mutation should push a live update, **emit on `eventBus`**, never write to `WsConnectionsManager` or a socket directly from a route. That keeps the write path (route → service → DB) decoupled from the fan-out path (event subscriber → connections). Concretely, to extend real-time updates to a new domain:

1. Give the domain an `ActivityAction`-shaped meta type (mirror `projectActivitiesMeta.ts`) and an activity service that inserts a row and returns `{ type, <parentId>, meta }`.
2. Call `eventBus.emit(activity.type, activity)` from the route after the mutation, guarded by `if (activity)` the same way `projects.ts` does.
3. Add a subscriber (or extend `registerProjectEvents`) that maps the event's parent ID to the right `WsConnectionsManager` broadcast — this requires the corresponding room type ("workspace", etc.) to also get real `onMessage` handling in `WebSocketManager`, since only `"project"` is implemented there today.
