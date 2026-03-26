export interface NormalizationItem {
    last_index: number;
    new_token: string;
}

export type NormalizationMap = Record<string, NormalizationItem>;

export interface Correction {
    startIndex: number;
    endIndex: number;
    newToken: string;
}

export interface NormalizationCreatePayload {
    first_index: number;
    last_index: number;
    new_token: string;
    suggest_for_all?: boolean;
}

export interface NormalizationDeletePayload {
    word_index: number;
}
