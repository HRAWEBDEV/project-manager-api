import * as argon2 from "argon2";
import { z } from "zod";

function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

function verifyPassword(password: string, compareWith: string) {
  return argon2.verify(compareWith, password);
}

function checkMyPassword(password: string) {
  return z
    .object({
      password: z.string().min(1, "PASSWORD IS REQUIRED"),
    })
    .parse({
      password,
    });
}

function checkAndHashPassword(password: string) {
  checkMyPassword(password);
  return hashPassword(password);
}

export { hashPassword, verifyPassword, checkMyPassword, checkAndHashPassword };
