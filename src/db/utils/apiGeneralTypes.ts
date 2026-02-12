import { type PaginationResShape } from "./paginationApi.ts";

type ApiResponse<T> = {
  data: T;
};

type ApiPaginationResponse<T> = ApiResponse<T> & PaginationResShape;

export type { ApiPaginationResponse, ApiResponse };
