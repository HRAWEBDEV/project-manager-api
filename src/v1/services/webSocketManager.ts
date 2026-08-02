import { Context } from "hono";
import type { WSContext, WSMessageReceive } from "hono/ws";
import { nanoid } from "nanoid";
import type {
  WsConnectionsManager,
  RoomType,
  ConnectionData,
} from "./wsConnectionsManager";
import z from "zod";

export class WebSocketManager {
  constructor(private readonly connectionManager: WsConnectionsManager) {}
  createConnection(c: Context) {
    const url = new URL(c.req.url);
    const namespace = url.pathname.split("/")[2] as RoomType;
    const connectionId = nanoid();

    function onOpen(this: WebSocketManager, _: Event, ws: WSContext) {
      this.connectionManager.addConnection(connectionId, {
        id: connectionId,
        ws,
        joinedRooms: new Map() as ConnectionData["joinedRooms"],
      });
    }

    function onMessage(
      this: WebSocketManager,
      e: MessageEvent<WSMessageReceive>,
      ws: WSContext,
    ) {
      switch (namespace) {
        case "project":
          if (typeof e.data !== "string") {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "invalid message",
              }),
            );
          } else {
            const parsedMessage = z
              .object({
                type: z.enum(["project.join"]),
                projectId: z.string(),
              })
              .safeParse(JSON.parse(e.data));
            if (parsedMessage.success) {
              this.connectionManager.joinProjectRoom(
                connectionId,
                parsedMessage.data.projectId,
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "invalid message",
                }),
              );
            }
          }
          break;
      }
    }

    function onClose(this: WebSocketManager, _: CloseEvent, ws: WSContext) {
      this.connectionManager.removeConnection(connectionId);
    }

    return {
      onOpen: onOpen.bind(this),
      onMessage: onMessage.bind(this),
      onClose: onClose.bind(this),
    };
  }
}
