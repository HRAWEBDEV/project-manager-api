import { Hono } from "hono";

const v1Routes = new Hono().basePath("/v1");

export { v1Routes };
