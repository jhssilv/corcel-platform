import type { MessageResponse } from "../domain/common";
import type { NormalizationMap } from "../domain/normalization";
import type { TextDetail, TextMetadata } from "../domain/text";
import type { CurrentUser, UserData, LoginResponse } from "../domain/user";
import type { JobStatusResponse } from "../domain/ocr";

export interface UsernamesResponse {
	usernames: string[];
}

export type LoginApiResponse = LoginResponse;

export type CurrentUserApiResponse = CurrentUser;

export type TextsDataResponse = TextMetadata[];

export type TextDetailResponse = TextDetail;

export type NormalizationsGetResponse = NormalizationMap;

export interface UploadResponse {
	job_id: string;
	batch_id: number;
}

export interface BatchStatusItem {
	id: number;
	source_file_name: string | null;
	processing_status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
	processing_attempts?: number;
}

export interface BatchStatusResponse {
	statuses: BatchStatusItem[];
	missing_ids: number[];
}

export type TextUploadBatchStatus =
	| "IMPORTING"
	| "QUEUED"
	| "PROCESSING"
	| "COMPLETED"
	| "COMPLETED_WITH_ERRORS"
	| "FAILED";

export interface TextUploadBatchSummary {
	id: number;
	source_file_name: string | null;
	status: TextUploadBatchStatus;
	status_message: string;
	is_recovering: boolean;
	total_files: number;
	created_texts: number;
	processed_texts: number;
	failed_texts: number;
	failed_files: string[];
	created_at?: string | null;
	updated_at?: string | null;
	import_finished_at?: string | null;
	processing_started_at?: string | null;
	processing_finished_at?: string | null;
	last_error?: string | null;
}

export interface TextUploadBatchDetail extends TextUploadBatchSummary {
	texts: BatchStatusItem[];
}

export interface ActiveTextUploadBatchesResponse {
	batches: TextUploadBatchSummary[];
}

export interface OCRUploadResponse {
	job_id: string;
}

export type JobStatusApiResponse = JobStatusResponse;

export interface WhitelistTokensResponse {
	tokens: string[];
}

export type UsersDataResponse = UserData[];

export type MessageApiResponse = MessageResponse;
