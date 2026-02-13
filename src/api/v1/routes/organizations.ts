import { Hono } from "hono";
import { getPaginationValues } from "../../../db/utils/paginationApi.ts";
import { NotFoundError } from "../../../db/utils/NotFound.ts";
import { and, asc, eq, ilike, SQL } from "drizzle-orm";
import {
  type Organization,
  organizationInsertSchema,
  organizations,
} from "../../../db/v1/schemas/organizations.ts";
import { parseUUID } from "../../../db/utils/apiIndetity.ts";
import { db } from "../../../db/connect.ts";
import { type ApiPaginationResponse } from "../../../db/utils/apiGeneralTypes.ts";

const router = new Hono().basePath("organizations");

const systematiceColumns = {
  id: true,
  code: true,
  createdAt: true,
  updatedAt: true,
  deleted: true,
} as const;
// get all
router.get("/", async (c) => {
  const query = c.req.query();
  const { search } = query;
  const { limit, offset } = getPaginationValues(query);

  function getSelectCondition() {
    let condition: SQL<unknown> | undefined = eq(organizations.deleted, false);
    if (search) {
      condition = and(
        condition,
        ilike(organizations.name, `%${search}%`),
      );
    }
    return condition;
  }
  const selectCodition = getSelectCondition();

  const rowCount = await db.$count(
    organizations,
    selectCodition,
  );
  const orgs = await db.select({
    id: organizations.id,
    name: organizations.name,
    code: organizations.code,
  }).from(organizations).where(
    selectCodition,
  ).orderBy(
    asc(organizations.createdAt),
  ).limit(limit as number).offset(offset as number);
  const res: ApiPaginationResponse<
    Pick<Organization, "id" | "name" | "code">[]
  > = {
    data: orgs,
    limit: limit as number,
    offset: offset as number,
    rowCount,
  };
  return c.json(res);
});
// get one
router.get("/:id", async (c) => {
  const id = c.req.param("id");
  parseUUID(id);
  try {
    const res = await db.select().from(organizations).where(
      eq(organizations.id, id),
    );
    return c.json(res);
  } catch {
    throw new NotFoundError("Organization not found");
  }
});
// insert
router.post("/", async (c) => {
  const body = await c.req.json();
  const { name, email, phoneNumber } = organizationInsertSchema
    .omit(systematiceColumns).parse(body);
  const res = await db.insert(organizations).values({
    name,
    phoneNumber,
    email,
    code: "test",
  }).returning({
    id: organizations.id,
  });
  return c.json(res);
});
// update
router.put("/:id", async (c) => {
  const id = c.req.param("id");
  parseUUID(id);
  const body = await c.req.json();
  const { name, email, phoneNumber } = organizationInsertSchema
    .omit(systematiceColumns).parse(body);
  const res = await db.update(organizations).set({ name, email, phoneNumber })
    .where(
      eq(organizations.id, id),
    ).returning({
      id: organizations.id,
    });
  return c.json(res);
});

export { router };
