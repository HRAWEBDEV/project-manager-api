import { Hono, type Handler } from "hono";
import { organizationMembers } from "./member/organizationMembers";
import { getUserOrganizations } from "./utils/getUserOrganizations";
import {
  type WithSessionVariables,
  getUser,
} from "../auth/utils/contextSessionVariables";

const organizationRoutes = new Hono().basePath("/organizations");
organizationRoutes.route("/", organizationMembers);

const handleGetOrganizations: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = getUser(c);
  const orgs = await getUserOrganizations(user.id);
  return c.json({ organizations: orgs });
};
organizationRoutes.get("/", handleGetOrganizations);

export { organizationRoutes };
