import { type PaginationResShape } from "./paginationApi.ts";

type ApiResponse<T> = {
  data: T;
};
type ApiErrorShape = {
  status: "failed" | string;
  code: number;
  message: string;
};

type ApiPaginationResponse<T> = ApiResponse<T> & PaginationResShape;

function getApiErrorShape(
  { status, code, message }: {
    status: ApiErrorShape["status"];
    code: number;
    message: string;
  },
): ApiErrorShape {
  return {
    status,
    code,
    message,
  };
}

export type { ApiErrorShape, ApiPaginationResponse, ApiResponse };
export { getApiErrorShape };
