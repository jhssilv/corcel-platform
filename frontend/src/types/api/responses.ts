import type { MessageResponse } from "../domain/common";
import type { NormalizationMap } from "../domain/normalization";
import type { TextDetail, TextMetadata } from "../domain/text";
import type { CurrentUser, UserData, LoginResponse } from "../domain/user";
import type { TaskStatusResponse } from "../domain/ocr";

export interface UsernamesResponse {
	usernames: string[];
}

export type LoginApiResponse = LoginResponse;

export type CurrentUserApiResponse = CurrentUser;

export type TextsDataResponse = TextMetadata[];

export type TextDetailResponse = TextDetail;

export type NormalizationsGetResponse = NormalizationMap;

export interface UploadResponse {
	message: string;
	text_ids: number[];
}

export interface BatchStatusItem {
	id: number;
	source_file_name: string;
	processing_status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
}

export interface BatchStatusResponse {
	statuses: BatchStatusItem[];
}

export interface OCRUploadResponse {
	task_id: string;
}

export type TaskStatusApiResponse = TaskStatusResponse;

export interface WhitelistTokensResponse {
	tokens: string[];
}

export type UsersDataResponse = UserData[];

export type MessageApiResponse = MessageResponse;
