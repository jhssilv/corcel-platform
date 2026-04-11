import { apiPrivate } from './Client';
import * as schemas from './Schemas';
import { unwrapData } from './Utils';
import type { TaskStatusApiResponse, UploadResponse, BatchStatusResponse } from '../types';

export async function uploadTextArchive(file: File, signal?: AbortSignal): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const data = unwrapData(await apiPrivate.post<UploadResponse>('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        signal,
    }));

    return schemas.UploadResponseSchema.parse(data);
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusApiResponse> {
    const data = unwrapData(await apiPrivate.get<TaskStatusApiResponse>(`/status/${taskId}`));
    return schemas.TaskStatusResponseSchema.parse(data);
}

export async function getBatchStatus(textIds: number[]): Promise<BatchStatusResponse> {
    const data = unwrapData(await apiPrivate.post<BatchStatusResponse>('/texts/status/batch', { text_ids: textIds }));
    return schemas.BatchStatusResponseSchema.parse(data);
}
