import { apiPublic, apiPrivate } from './Client';
import * as schemas from './Schemas';
import { unwrapData } from './Utils';
import type { LoginApiResponse, MessageApiResponse, UsernamesResponse } from '../types';

export async function getUsernames(): Promise<UsernamesResponse> {
    const data = unwrapData(await apiPublic.get<UsernamesResponse>('/users'));
    return schemas.UsernamesResponseSchema.parse(data);
}

export async function authenticateUser(username: string, password: string): Promise<LoginApiResponse> {
    const response = unwrapData(await apiPublic.post<LoginApiResponse>('/login', { username, password }));
    return schemas.LoginResponseSchema.parse(response);
}

export async function logoutUser(): Promise<MessageApiResponse> {
    const response = unwrapData(await apiPrivate.get<MessageApiResponse>('/logout'));
    return schemas.MessageResponseSchema.parse(response);
}

export async function activateUser(username: string, password: string): Promise<MessageApiResponse> {
    const response = unwrapData(
        await apiPublic.post<MessageApiResponse>('/activate', {
            username,
            password,
        }),
    );

    return schemas.MessageResponseSchema.parse(response);
}
