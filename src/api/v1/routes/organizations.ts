import { Hono } from "hono";
import { getPaginationValues } from "../../../db/utils/paginationApi.ts";
import { asc } from "drizzle-orm";
import {
  type Organization,
  organizations,
} from "../../../db/v1/schemas/organizations.ts";
import { db } from "../../../db/connect.ts";
import { type ApiPaginationResponse } from "../../../db/utils/apiGeneralTypes.ts";

const router = new Hono().basePath("organizations");
// get all
router.get("/", async (c) => {
  const query = c.req.query();
  const { limit, offset } = getPaginationValues(query);
  const rowCount = await db.$count(organizations);
  const orgs = await db.select().from(organizations).orderBy(
    asc(organizations.createdAt),
  ).limit(limit as number).offset(offset as number);
  const res: ApiPaginationResponse<Organization[]> = {
    data: orgs,
    limit: limit as number,
    offset: offset as number,
    rowCount,
  };
  return c.json(res);
});
// get one
// insert
// update

export { router };
