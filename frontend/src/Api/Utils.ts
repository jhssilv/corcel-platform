import type { AxiosResponse } from "axios";

export type ApiResult<T> = T | AxiosResponse<T>;

export function unwrapData<T>(result: ApiResult<T>): T {
	if (typeof result === "object" && result !== null && "data" in result) {
		return (result as AxiosResponse<T>).data;
	}

	return result as T;
}
