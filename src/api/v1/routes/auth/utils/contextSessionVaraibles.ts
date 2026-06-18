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

export type { WithSessionVariables };
export { USER, SESSION };
