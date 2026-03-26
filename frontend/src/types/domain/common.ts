export type ID = number;

export type Nullable<T> = T | null;

export interface MessageResponse {
    message: string;
}

export interface Option<TValue = string | number> {
    value: TValue;
    label: string;
}

export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
}
