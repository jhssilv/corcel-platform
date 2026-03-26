import type { MessageResponse } from '../domain/common';
import type { NormalizationMap } from '../domain/normalization';
import type { TextDetail, TextMetadata } from '../domain/text';
import type { UserData, LoginResponse } from '../domain/user';
import type { TaskStatusResponse } from '../domain/ocr';

export interface UsernamesResponse {
  usernames: string[];
}

export type LoginApiResponse = LoginResponse;

export type TextsDataResponse = TextMetadata[];

export type TextDetailResponse = TextDetail;

export type NormalizationsGetResponse = NormalizationMap;

export interface UploadResponse {
  task_id: string;
}

export type TaskStatusApiResponse = TaskStatusResponse;

export interface WhitelistTokensResponse {
  tokens: string[];
}

export type UsersDataResponse = UserData[];

export type MessageApiResponse = MessageResponse;
