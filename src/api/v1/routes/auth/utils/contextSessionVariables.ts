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

function getUser(c: Context) {
  return c.get(USER);
}
function setUser(c: Context, user: User) {
  c.set(USER, user);
}

function getSession(c: Context) {
  return c.get(SESSION);
}
function setSession(c: Context, session: Session) {
  c.set(SESSION, session);
}

export type { WithSessionVariables };
export { USER, SESSION, getUser, setUser, getSession, setSession };
