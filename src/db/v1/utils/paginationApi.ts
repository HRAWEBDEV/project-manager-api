import { z } from "zod";
import { type HonoRequest } from "hono";

const pageSizeQueryName = "page-size";
const pageQueryName = "page";

type Pagination = z.infer<typeof paginationSchema>;
type PaginationResShape = {
  rowCount: number;
  page: number;
  pageSize: number;
} & Pagination;

const paginationSchema = z.object({
  [pageSizeQueryName]: z.coerce.number().min(1),
  [pageQueryName]: z.coerce.number().min(0),
});

const paginationDefaults = {
  [pageSizeQueryName]: 10,
  [pageQueryName]: 0,
};

function getPaginationValues(query: ReturnType<HonoRequest["query"]>) {
  const pagination: Pagination = {
    ...paginationDefaults,
  };
  const limitQuery = query[pageSizeQueryName];
  const offsetQuery = query[pageQueryName];
  if (paginationSchema.shape[pageSizeQueryName].safeParse(limitQuery).success) {
    pagination[pageSizeQueryName] = Number(limitQuery);
  }
  if (paginationSchema.shape[pageQueryName].safeParse(offsetQuery).success) {
    pagination[pageQueryName] = Number(offsetQuery);
  }
  return pagination;
}

export type { PaginationResShape };
export {
  getPaginationValues,
  pageSizeQueryName,
  pageQueryName,
  paginationDefaults,
  paginationSchema,
};
