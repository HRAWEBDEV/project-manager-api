import { z } from "zod";
import { HonoRequest } from "hono";

const limitQueryName = "limit";
const offsetQueryName = "offset";

type Pagination = z.infer<typeof paginationSchema>;
type PaginationResShape = {
  rowCount: number;
} & Pagination;

const paginationSchema = z.object({
  [limitQueryName]: z.coerce.number().min(1),
  [offsetQueryName]: z.coerce.number().min(0),
});

const paginationDefaults = {
  [limitQueryName]: 10,
  [offsetQueryName]: 0,
};

function getPaginationValues(query: ReturnType<HonoRequest["query"]>) {
  const pagination: Pagination = {
    ...paginationDefaults,
  };
  const limitQuery = query[limitQueryName];
  const offsetQuery = query[offsetQueryName];
  if (paginationSchema.shape[limitQueryName].safeParse(limitQuery).success) {
    pagination[limitQueryName] = Number(limitQuery);
  }
  if (
    paginationSchema.shape[offsetQueryName].safeParse(offsetQuery).success
  ) {
    pagination[offsetQueryName] = Number(offsetQuery);
  }
  return pagination;
}

export type { PaginationResShape };
export {
  getPaginationValues,
  limitQueryName,
  offsetQueryName,
  paginationDefaults,
  paginationSchema,
};
