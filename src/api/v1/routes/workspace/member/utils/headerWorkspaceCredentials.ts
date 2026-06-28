import type { Context } from "hono";

export function getHeaderWorkspaceID(c: Context) {
  return c.req.header("workspace-id");
}
