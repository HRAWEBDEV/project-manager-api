import type { WsConnectionsManager } from "../../services/wsConnectionsManager";
import { registerProjectEvents } from "./registerProjectEvents";

export function registerAppEvents(connectionManager: WsConnectionsManager) {
  registerProjectEvents(connectionManager);
}
