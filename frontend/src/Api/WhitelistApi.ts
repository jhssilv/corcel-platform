import { apiPrivate } from "./Client";
import * as schemas from "./Schemas";
import { unwrapData } from "./Utils";
import type { WhitelistTokensResponse } from "../types";

export async function addToWhitelist(tokenText: string): Promise<void> {
	const payload = {
		token_text: tokenText,
		action: "add",
	};

	await apiPrivate.post("/whitelist/", payload);
}

export async function removeFromWhitelist(tokenText: string): Promise<void> {
	const payload = {
		token_text: tokenText,
		action: "remove",
	};

	await apiPrivate.delete("/whitelist/", { data: payload });
}

export async function getWhitelist(): Promise<WhitelistTokensResponse> {
	const data = unwrapData(
		await apiPrivate.get<WhitelistTokensResponse>("/whitelist/"),
	);
	return schemas.WhitelistTokensResponseSchema.parse(data);
}
