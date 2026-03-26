export const STORAGE_KEYS = {
    IS_AUTHENTICATED: 'isAuthenticated',
    USERNAME: 'username',
    IS_ADMIN: 'isAdmin',
    TEXT_IDS: 'textIds',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
