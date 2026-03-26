import type { ID } from '../domain/common';
import type { BulkAssignmentPayload } from '../domain/assignment';
import type { NormalizationCreatePayload, NormalizationDeletePayload } from '../domain/normalization';

export interface FilterTextsRequest {
    grades?: number[];
    assignedUsers?: string[];
    normalized?: boolean;
    fileName?: string;
}

export interface DownloadRequest {
    text_ids: ID[];
    use_tags?: boolean;
}

export interface ReportRequest {
    text_ids: ID[];
}

export interface RawTextUpdateRequest {
    text_content: string;
}

export interface FinalizeRawTextRequest {
    source_file_name?: string;
}

export interface WhitelistManageRequest {
    token_text: string;
    action: 'add' | 'remove';
}

export type NormalizationCreateRequest = NormalizationCreatePayload;
export type NormalizationDeleteRequest = NormalizationDeletePayload;
export type BulkAssignRequest = BulkAssignmentPayload;
