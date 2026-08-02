import { eventBus } from "./eventBus";
import { type ActivityAction } from "./projectActivitiesMeta";
import { WsConnectionsManager } from "../../services/wsConnectionsManager";

export function registerProjectEvents(connectionManager: WsConnectionsManager) {
  const eventNames: ActivityAction["type"][] = [
    "created",
    "deleted",
    "member_added",
    "member_removed",
    "updated",
  ];
  for (const eventName of eventNames) {
    eventBus.on(eventName, (data) => {
      connectionManager.broadcastToProjectRoom(
        data.projectId,
        JSON.stringify(data),
      );
    });
  }
}
