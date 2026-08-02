import type { WSContext } from "hono/ws";

type RoomType = "project" | "chat";

interface ConnectionData {
  id: string;
  ws: WSContext;
  jonedRooms: Map<RoomType, Set<string>>;
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
  joinProjectRoom(id: string, projectId: string) {
    const connection = this.connections.get(id);
    if (connection) {
      if (!connection.jonedRooms.has("project")) {
        connection.jonedRooms.set("project", new Set());
      }
      connection.jonedRooms.get("project")!.add(projectId);
    }
  }
  exitProjectRoom(id: string, projectId: string) {
    const connection = this.connections.get(id);
    if (connection) {
      if (connection.jonedRooms.has("project")) {
        connection.jonedRooms.get("project")!.delete(projectId);
      }
    }
  }
  // chat
}

export type { ConnectionData, RoomType };
export { WsConnectionsManager };
