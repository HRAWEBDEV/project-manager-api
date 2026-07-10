import { Context } from "hono";

const USER_AGENT = "User-Agent";
const IP_ADDRESS = "x-forwarded-for";

function getUserAgent(c: Context) {
  return c.req.header(USER_AGENT);
}
function getUserIpAddress(c: Context) {
  return (
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For") ??
    c.req.header("X-Real-IP")
  );
}

export { getUserAgent, getUserIpAddress };
