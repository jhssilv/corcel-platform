import { apiPrivate } from './Client';
import type { BulkAssignRequest } from '../types';

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