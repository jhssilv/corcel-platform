import { apiPrivate } from './Client';
import * as schemas from './Schemas';
import { unwrapData } from './Utils';
import type { TaskStatusApiResponse, UploadResponse } from '../types';

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
