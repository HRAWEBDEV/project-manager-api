import type { WSContext } from "hono/ws";

type RoomType = "organization" | "workspace" | "project" | "chat";

interface ConnectionData {
  id: string;
  ws: WSContext;
  joinedRooms: Map<RoomType, Set<string>>;
}

class WsConnectionsManager {
  private connections: Map<string, ConnectionData> = new Map();
  constructor() {}
  getConnection(id: string) {
    return this.connections.get(id);
  }
  addConnection(id: string, data: ConnectionData) {
    this.connections.set(id, data);
  }
  removeConnection(id: string) {
    this.connections.delete(id);
  }
  // project
  broadcastToProjectRoom(projectId: string, message: string) {
    for (const connection of this.connections.values()) {
      if (
        connection.joinedRooms.has("project") &&
        connection.joinedRooms.get("project")!.has(projectId)
      ) {
        connection.ws.send(message);
      }
    }
  }
  joinProjectRoom(id: string, projectId: string) {
    const connection = this.connections.get(id);
    if (connection) {
      if (!connection.joinedRooms.has("project")) {
        connection.joinedRooms.set("project", new Set());
      }
      connection.joinedRooms.get("project")!.add(projectId);
    }
  }
  exitProjectRoom(id: string, projectId: string) {
    const connection = this.connections.get(id);
    if (connection) {
      if (connection.joinedRooms.has("project")) {
        connection.joinedRooms.get("project")!.delete(projectId);
      }
    }
  }
  // chat
}

export type { ConnectionData, RoomType };
export { WsConnectionsManager };
