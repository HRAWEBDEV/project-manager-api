import type { Context } from "hono";
import { type Session } from "../../db/schemas/sessions";
import { type User } from "../../db/schemas/users";
import { type OrganizationRole } from "./organizationPermissions";
import { CONTEXT_USER_ORGANIZATION_ROLE } from "./userActiveOrganization";

const USER = "user";
const SESSION = "session";

type WithSessionUserVariables = {
  Variables: {
    [USER]: User;
    [SESSION]: Session;
    [CONTEXT_USER_ORGANIZATION_ROLE]: OrganizationRole;
  };
};

function getContextUser(
  c: Context<{
    Variables: WithSessionUserVariables["Variables"];
  }>,
) {
  const user = c.get(USER);
  if (!user) throw new Error("User not set");
  return user;
}
function setContextUser(c: Context, user: User) {
  c.set(USER, user);
}

function getContextSession(
  c: Context<{
    Variables: WithSessionUserVariables["Variables"];
  }>,
) {
  const session = c.get(SESSION);
  if (!session) throw new Error("Session not set");
  return session;
}
function setContextSession(c: Context, session: Session) {
  c.set(SESSION, session);
}

export type { WithSessionUserVariables };
export {
  USER,
  SESSION,
  getContextUser,
  setContextUser,
  getContextSession,
  setContextSession,
};
