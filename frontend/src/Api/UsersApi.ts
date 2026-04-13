import { apiPrivate } from "./Client";
import * as schemas from "./Schemas";
import { unwrapData } from "./Utils";
import type { MessageApiResponse, UserData } from "../types";

export async function registerUser(
	username: string,
): Promise<MessageApiResponse> {
	const response = unwrapData(
		await apiPrivate.post<MessageApiResponse>("/register", { username }),
	);

	const parsed = schemas.MessageResponseSchema.safeParse(response);
	if (parsed.success) {
		return parsed.data;
	}

	if (response && typeof response === "object") {
		const maybeError = (response as { error?: unknown }).error;
		if (typeof maybeError === "string" && maybeError.length > 0) {
			throw response;
		}
	}

	return { message: "Usuário criado com sucesso!" };
}

export async function getUsersData(): Promise<UserData[]> {
	const data = unwrapData(
		await apiPrivate.get<{ usersData: unknown }>("/users/data"),
	);
	return schemas.UsersDataResponseSchema.parse(data.usersData);
}

export async function toggleUserActive(username: string): Promise<unknown> {
	const response = await apiPrivate.patch("/users/toggleActive", { username });
	return response;
}

export async function toggleUserAdmin(username: string): Promise<unknown> {
	const response = await apiPrivate.patch("/users/toggleAdmin", { username });
	return response;
}
