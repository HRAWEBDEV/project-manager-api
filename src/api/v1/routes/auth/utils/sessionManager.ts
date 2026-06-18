import { randomBytes, subtle } from "crypto";

const SESSION_EXPIRE_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_NAME = "user_session";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken() {
  return randomBytes(32).toString("hex");
}

async function hashToken(token: string) {
  const data = new TextEncoder().encode(token);
  const hash = await subtle.digest("SHA-256", data);
  return toHex(hash);
}

export { generateToken, hashToken, SESSION_EXPIRE_MS, SESSION_NAME };
