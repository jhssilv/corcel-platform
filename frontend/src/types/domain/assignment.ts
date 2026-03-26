import type { ID } from './common';

export interface BulkAssignmentPayload {
    text_ids: ID[];
    usernames: string[];
}

export interface TextAssignment {
    textId: ID;
    username: string;
    assigned: boolean;
    normalized: boolean;
}
