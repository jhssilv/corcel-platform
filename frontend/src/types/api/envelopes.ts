import type { ApiError } from "./errors";

export type ApiResult<TData> =
	| {
			ok: true;
			data: TData;
	  }
	| {
			ok: false;
			error: ApiError;
	  };

export interface ListEnvelope<TData> {
	data: TData[];
}

export interface KeyedListEnvelope<TKey extends string, TData> {
	[key: string]: unknown;
}

export interface BlobDownloadResult {
	success: true;
	filename: string;
}
