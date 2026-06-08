import { apiPrivate } from "./Client";
import * as schemas from "./Schemas";
import { unwrapData } from "./Utils";
import type {
	ActiveTextUploadBatchesResponse,
	JobStatusApiResponse,
	TextUploadBatchDetail,
	UploadResponse,
	BatchStatusResponse,
} from "../types";

export async function uploadTextArchive(
	file: File,
	signal?: AbortSignal,
): Promise<UploadResponse> {
	const formData = new FormData();
	formData.append("file", file);

	const data = unwrapData(
		await apiPrivate.post<UploadResponse>("/upload", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
			signal,
		}),
	);

	return schemas.UploadResponseSchema.parse(data);
}

export async function getJobStatus(
	jobId: string,
): Promise<JobStatusApiResponse> {
	const data = unwrapData(
		await apiPrivate.get<JobStatusApiResponse>(`/status/${jobId}`),
	);
	return schemas.JobStatusResponseSchema.parse(data);
}

export async function getBatchStatus(
	textIds: number[],
): Promise<BatchStatusResponse> {
	const data = unwrapData(
		await apiPrivate.post<BatchStatusResponse>("/texts/status/batch", {
			text_ids: textIds,
		}),
	);
	return schemas.BatchStatusResponseSchema.parse(data);
}

export async function getTextUploadBatch(
	batchId: number,
): Promise<TextUploadBatchDetail> {
	const data = unwrapData(
		await apiPrivate.get<TextUploadBatchDetail>(`/text-upload-batches/${batchId}`),
	);
	return schemas.TextUploadBatchDetailSchema.parse(data);
}

export async function getActiveTextUploadBatches(): Promise<ActiveTextUploadBatchesResponse> {
	const data = unwrapData(
		await apiPrivate.get<ActiveTextUploadBatchesResponse>("/text-upload-batches/active"),
	);
	return schemas.ActiveTextUploadBatchesResponseSchema.parse(data);
}
