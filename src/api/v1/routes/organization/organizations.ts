import { Hono, type Handler } from "hono";
import { getUserOrganizations } from "./utils/getUserOrganizations";
import {
  type WithSessionVariables,
  USER,
} from "../auth/utils/contextSessionVaraibles";

const organizationRoutes = new Hono().basePath("/organizations");

const handleGetOrganizations: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const orgs = await getUserOrganizations(user.id);
  return c.json({ organizations: orgs });
};
organizationRoutes.get("/", handleGetOrganizations);

export { organizationRoutes };
