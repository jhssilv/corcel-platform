import type { ID } from './common';

export interface Token {
    id: ID;
    text: string;
    isWord: boolean;
    position: number;
    candidates: string[];
    toBeNormalized: boolean;
    whitespaceAfter: string;
    whitelisted: boolean;
}

export type TokenDetailItem = Token;

export interface TokenUpdateRequest {
    tokenId: ID;
    newValue: string;
}

export interface TokenSuggestionToggleRequest {
    tokenId: ID;
}
