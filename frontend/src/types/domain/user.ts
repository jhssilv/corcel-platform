import type { Nullable } from './common';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    message: string;
    isAdmin: boolean;
}

export interface UserData {
    username: string;
    isAdmin: boolean;
    isActive: boolean;
    lastLogin: Nullable<string>;
}

export interface AuthSession {
    isAuthenticated: boolean;
    username: string | null;
    isAdmin: boolean;
}
