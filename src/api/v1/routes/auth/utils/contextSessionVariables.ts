import type { Context } from "hono";
import { type Session } from "../../../../../db/v1/schemas/sessions";
import { type User } from "../../../../../db/v1/schemas/users";

const USER = "user";
const SESSION = "session";

type WithSessionVariables = {
  Variables: {
    [USER]: User;
    [SESSION]: Session;
  };
};

function getUser(
  c: Context<{
    Variables: WithSessionVariables["Variables"];
  }>,
) {
  const user = c.get(USER);
  if (!user) throw new Error("User not set");
  return user;
}
function setUser(c: Context, user: User) {
  c.set(USER, user);
}

function getSession(
  c: Context<{
    Variables: WithSessionVariables["Variables"];
  }>,
) {
  const session = c.get(SESSION);
  if (!session) throw new Error("Session not set");
  return session;
}
function setSession(c: Context, session: Session) {
  c.set(SESSION, session);
}

export type { WithSessionVariables };
export { USER, SESSION, getUser, setUser, getSession, setSession };
