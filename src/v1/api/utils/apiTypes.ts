type ApiErrorShape = {
  status: "failed" | string;
  code: number;
  message: string;
};

function getApiErrorShape({
  status,
  code,
  message,
}: {
  status: ApiErrorShape["status"];
  code: number;
  message: string;
}): ApiErrorShape {
  return {
    status,
    code,
    message,
  };
}

export type { ApiErrorShape };
export { getApiErrorShape };
