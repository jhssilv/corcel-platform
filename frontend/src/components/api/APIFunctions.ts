import { saveAs } from 'file-saver';
import type { AxiosResponse } from 'axios';
import { apiBlob, apiPublic, apiPrivate } from './APIClient';
import * as schemas from './Schemas';
import type {
  BulkAssignRequest,
  DownloadRequest,
  FilterTextsRequest,
  LoginApiResponse,
  MessageApiResponse,
  NormalizationMap,
  RawTextDetail,
  RawTextMetadata,
  TaskStatusApiResponse,
  TextDetailResponse,
  TextsDataResponse,
  UploadResponse,
  UserData,
  UsernamesResponse,
  WhitelistTokensResponse,
} from '../../types';

interface FinalizeRawTextResponse {
  message: string;
  text_id: number;
}

interface DownloadResult {
  success: true;
  filename: string;
}

type ApiResult<T> = T | AxiosResponse<T>;

function unwrapData<T>(result: ApiResult<T>): T {
  if (typeof result === 'object' && result !== null && 'data' in result) {
    return (result as AxiosResponse<T>).data;
  }

  return result as T;
}

export async function getUsernames(): Promise<UsernamesResponse> {
  const data = unwrapData(await apiPublic.get<UsernamesResponse>('/users'));
  return schemas.UsernamesResponseSchema.parse(data);
}

export async function authenticateUser(username: string, password: string): Promise<LoginApiResponse> {
  const response = unwrapData(await apiPublic.post<LoginApiResponse>('/login', { username, password }));
  return schemas.LoginResponseSchema.parse(response);
}

export async function logoutUser(): Promise<MessageApiResponse> {
  const response = unwrapData(await apiPrivate.get<MessageApiResponse>('/logout'));
  return schemas.MessageResponseSchema.parse(response);
}

export async function getTextsData(): Promise<TextsDataResponse> {
  const data = unwrapData(await apiPrivate.get<{ textsData: unknown }>('/texts/'));
  return schemas.TextsDataResponseSchema.parse(data.textsData);
}

export async function getRawTextsData(): Promise<RawTextMetadata[]> {
  const data = unwrapData(await apiPrivate.get<{ textsData: unknown }>('/raw-texts/'));
  return schemas.RawTextsDataResponseSchema.parse(data.textsData);
}

export async function getFilteredTextsData(filters: FilterTextsRequest = {}): Promise<TextsDataResponse> {
  const params = new URLSearchParams();

  if (filters.grades && filters.grades.length > 0) {
    params.append('grades', filters.grades.join(','));
  }

  if (filters.assignedUsers && filters.assignedUsers.length > 0) {
    params.append('assigned_users', filters.assignedUsers.join(','));
  }

  if (filters.normalized !== undefined && filters.normalized !== null) {
    params.append('normalized', filters.normalized.toString());
  }

  if (filters.fileName) {
    params.append('file_name', filters.fileName);
  }

  const queryString = params.toString();
  const url = queryString ? `/texts/filtered?${queryString}` : '/texts/filtered';
  const data = unwrapData(await apiPrivate.get<{ textsData: unknown }>(url));

  return schemas.TextsDataResponseSchema.parse(data.textsData);
}

export async function getTextById(textId: number): Promise<TextDetailResponse> {
  const data = unwrapData(await apiPrivate.get<TextDetailResponse>(`/texts/${textId}`));
  return schemas.TextDetailResponseSchema.parse(data);
}

export async function getRawTextById(textId: number): Promise<RawTextDetail> {
  const data = unwrapData(await apiPrivate.get<RawTextDetail>(`/raw-texts/${textId}`));
  return schemas.RawTextDetailResponseSchema.parse(data);
}

export async function updateRawText(textId: number, textContent: string): Promise<MessageApiResponse> {
  const payload = { text_content: textContent };
  const response = unwrapData(await apiPrivate.put<MessageApiResponse>(`/raw-texts/${textId}`, payload));
  return schemas.MessageResponseSchema.parse(response);
}

export async function finalizeRawText(
  textId: number,
  sourceFileName: string | null = null,
): Promise<FinalizeRawTextResponse> {
  const payload = sourceFileName ? { source_file_name: sourceFileName } : {};
  const response = unwrapData(
    await apiPrivate.post<FinalizeRawTextResponse>(`/raw-texts/${textId}/finalize`, payload),
  );

  return response;
}

export async function getNormalizationsByText(textId: number): Promise<NormalizationMap> {
  const data = unwrapData(await apiPrivate.get<NormalizationMap>(`/texts/${textId}/normalizations`));
  return schemas.NormalizationsGetResponseSchema.parse(data);
}

export async function postNormalization(
  textId: number,
  firstWordIndex: number,
  lastWordIndex: number,
  newToken: string,
  suggestForAll = false,
): Promise<unknown> {
  const payload = {
    first_index: firstWordIndex,
    last_index: lastWordIndex,
    new_token: newToken,
    suggest_for_all: suggestForAll,
  };

  schemas.NormalizationCreateRequestSchema.parse(payload);
  return apiPrivate.post(`/texts/${textId}/normalizations`, payload);
}

export async function deleteNormalization(textId: number, wordIndex: number): Promise<unknown> {
  const payload = { word_index: wordIndex };

  schemas.NormalizationDeleteRequestSchema.parse(payload);
  return apiPrivate.delete(`/texts/${textId}/normalizations`, { data: payload });
}

export async function toggleNormalizedStatus(textId: number): Promise<MessageApiResponse> {
  const data = unwrapData(await apiPrivate.patch<MessageApiResponse>(`/texts/${textId}/normalizations`));
  return schemas.MessageResponseSchema.parse(data);
}

export async function requestDownload(textIds: number[], useTags: boolean): Promise<DownloadResult> {
  const payload: DownloadRequest = {
    text_ids: textIds,
    use_tags: useTags,
  };

  const response = await apiBlob.post<Blob>('/download/', payload, {
    responseType: 'blob',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const filename = 'normalized_texts.zip';
  saveAs(response.data, filename);

  return { success: true, filename };
}

export async function requestReport(textIds: number[]): Promise<void> {
  const payload = {
    text_ids: textIds,
  };

  const response = await apiBlob.post<Blob>('/report/', payload, {
    responseType: 'blob',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  saveAs(response.data, 'report.csv');
}

export async function uploadTextArchive(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const data = unwrapData(await apiPrivate.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }));

  return schemas.UploadResponseSchema.parse(data);
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusApiResponse> {
  const data = unwrapData(await apiPrivate.get<TaskStatusApiResponse>(`/status/${taskId}`));
  return schemas.TaskStatusResponseSchema.parse(data);
}

export async function toggleToBeNormalized(tokenId: number): Promise<void> {
  const payload = {
    token_id: tokenId,
  };

  await apiPrivate.patch(`/tokens/${tokenId}/suggestions/toggle`, payload);
}

export async function addToWhitelist(tokenText: string): Promise<void> {
  const payload = {
    token_text: tokenText,
    action: 'add',
  };

  await apiPrivate.post('/whitelist/', payload);
}

export async function removeFromWhitelist(tokenText: string): Promise<void> {
  const payload = {
    token_text: tokenText,
    action: 'remove',
  };

  await apiPrivate.delete('/whitelist/', { data: payload });
}

export async function getWhitelist(): Promise<WhitelistTokensResponse> {
  const data = unwrapData(await apiPrivate.get<WhitelistTokensResponse>('/whitelist/'));
  return schemas.WhitelistTokensResponseSchema.parse(data);
}

export async function registerUser(username: string): Promise<MessageApiResponse> {
  const response = unwrapData(await apiPrivate.post<MessageApiResponse>('/register', { username }));
  return schemas.MessageResponseSchema.parse(response);
}

export async function activateUser(username: string, password: string): Promise<MessageApiResponse> {
  const response = unwrapData(
    await apiPublic.post<MessageApiResponse>('/activate', {
      username,
      password,
    }),
  );

  return schemas.MessageResponseSchema.parse(response);
}

export async function getUsersData(): Promise<UserData[]> {
  const data = unwrapData(await apiPrivate.get<{ usersData: unknown }>('/users/data'));
  return schemas.UsersDataResponseSchema.parse(data.usersData);
}

export async function toggleUserActive(username: string): Promise<unknown> {
  const response = await apiPrivate.patch('/users/toggleActive', { username });
  return response;
}

export async function toggleUserAdmin(username: string): Promise<unknown> {
  const response = await apiPrivate.patch('/users/toggleAdmin', { username });
  return response;
}

export async function deleteAllNormalizations(textId: number): Promise<unknown> {
  const response = await apiPrivate.delete(`/texts/${textId}/normalizations/all`);
  return response;
}

export async function bulkAssignTexts(textIds: number[], usernames: string[]): Promise<unknown> {
  const payload: BulkAssignRequest = {
    text_ids: textIds,
    usernames,
  };

  const response = await apiPrivate.post('/assignments/', payload);
  return response;
}

export async function bulkUnassignTexts(textIds: number[], usernames: string[]): Promise<unknown> {
  const payload: BulkAssignRequest = {
    text_ids: textIds,
    usernames,
  };

  const response = await apiPrivate.delete('/assignments/', { data: payload });
  return response;
}

export async function uploadOCRArchive(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = unwrapData(await apiPrivate.post<UploadResponse>('/ocr/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000,
  }));

  return schemas.UploadResponseSchema.parse(response);
}

export async function getTextImage(textId: number): Promise<string | null> {
  try {
    const blob = unwrapData(await apiPrivate.get<Blob>(`/ocr/texts/${textId}/image`, { responseType: 'blob' }));

    if (!(blob instanceof Blob)) {
      console.warn('Response is not a blob', blob);
      return null;
    }

    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn('Could not fetch image for text', textId, error);
    return null;
  }
}

export async function getRawTextImage(textId: number): Promise<string | null> {
  try {
    const blob = unwrapData(
      await apiPrivate.get<Blob>(`/ocr/raw-texts/${textId}/image`, { responseType: 'blob' }),
    );

    if (!(blob instanceof Blob)) {
      console.warn('Response is not a blob', blob);
      return null;
    }

    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error fetching raw text image:', error);
    return null;
  }
}

export async function updateToken(textId: number, tokenId: number, newValue: string): Promise<unknown> {
  const payload = {
    token_id: tokenId,
    new_value: newValue,
  };

  return apiPrivate.post(`/ocr/texts/${textId}/tokens`, payload);
}
