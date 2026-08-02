import { Context } from "hono";
import type { WSContext, WSMessageReceive } from "hono/ws";
import { nanoid } from "nanoid";
import type { WsConnectionsManager, RoomType } from "./wsConnectionsManager";

export class WebSocketManager {
  constructor(private readonly connectionManager: WsConnectionsManager) {}
  createConnection(c: Context) {
    const url = new URL(c.req.url);
    const path = url.pathname;
    const namespace = path.split("/")[2];
    const connectionId = nanoid();
    return {
      onOpen: (_: Event, ws: WSContext) => {
        this.connectionManager.addConnection(connectionId, {
          id: connectionId,
          ws,
          jonedRooms: new Map(),
        });
      },
      onMessage: (e: MessageEvent<WSMessageReceive>, ws: WSContext) => {
        switch (namespace as RoomType) {
          case "project":
            break;
        }
      },
      onClose: (_: CloseEvent, ws: WSContext) => {
        this.connectionManager.removeConnection(connectionId);
      },
    };
  }
}
