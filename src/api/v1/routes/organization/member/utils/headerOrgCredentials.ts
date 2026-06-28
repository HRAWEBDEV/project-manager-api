import type { Context } from "hono";

export function getHeaderOrganizationID(c: Context) {
  return c.req.header("organization-id");
}
