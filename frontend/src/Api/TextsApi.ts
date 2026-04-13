import { apiPrivate } from "./Client";
import * as schemas from "./Schemas";
import { unwrapData } from "./Utils";
import type {
	FilterTextsRequest,
	MessageApiResponse,
	NormalizationMap,
	RawTextDetail,
	RawTextMetadata,
	TextDetailResponse,
	TextsDataResponse,
} from "../types";

interface FinalizeRawTextResponse {
	message: string;
	text_id: number;
}

export async function getTextsData(): Promise<TextsDataResponse> {
	const data = unwrapData(
		await apiPrivate.get<{ textsData: unknown }>("/texts/"),
	);
	return schemas.TextsDataResponseSchema.parse(data.textsData);
}

export async function getRawTextsData(): Promise<RawTextMetadata[]> {
	const data = unwrapData(
		await apiPrivate.get<{ textsData: unknown }>("/raw-texts/"),
	);
	return schemas.RawTextsDataResponseSchema.parse(data.textsData);
}

export async function getFilteredTextsData(
	filters: FilterTextsRequest = {},
): Promise<TextsDataResponse> {
	const params = new URLSearchParams();

	if (filters.grades && filters.grades.length > 0) {
		params.append("grades", filters.grades.join(","));
	}

	if (filters.assignedUsers && filters.assignedUsers.length > 0) {
		params.append("assigned_users", filters.assignedUsers.join(","));
	}

	if (filters.normalized !== undefined && filters.normalized !== null) {
		params.append("normalized", filters.normalized.toString());
	}

	if (filters.fileName) {
		params.append("file_name", filters.fileName);
	}

	const queryString = params.toString();
	const url = queryString
		? `/texts/filtered?${queryString}`
		: "/texts/filtered";
	const data = unwrapData(await apiPrivate.get<{ textsData: unknown }>(url));

	return schemas.TextsDataResponseSchema.parse(data.textsData);
}

export async function getTextById(textId: number): Promise<TextDetailResponse> {
	const data = unwrapData(
		await apiPrivate.get<TextDetailResponse>(`/texts/${textId}`),
	);
	return schemas.TextDetailResponseSchema.parse(data);
}

export async function getRawTextById(textId: number): Promise<RawTextDetail> {
	const data = unwrapData(
		await apiPrivate.get<RawTextDetail>(`/raw-texts/${textId}`),
	);
	return schemas.RawTextDetailResponseSchema.parse(data);
}

export async function updateRawText(
	textId: number,
	textContent: string,
): Promise<MessageApiResponse> {
	const payload = { text_content: textContent };
	const response = unwrapData(
		await apiPrivate.put<MessageApiResponse>(`/raw-texts/${textId}`, payload),
	);
	return schemas.MessageResponseSchema.parse(response);
}

export async function finalizeRawText(
	textId: number,
	sourceFileName: string | null = null,
): Promise<FinalizeRawTextResponse> {
	const payload = sourceFileName ? { source_file_name: sourceFileName } : {};
	const response = unwrapData(
		await apiPrivate.post<FinalizeRawTextResponse>(
			`/raw-texts/${textId}/finalize`,
			payload,
		),
	);

	return response;
}

export async function getNormalizationsByText(
	textId: number,
): Promise<NormalizationMap> {
	const data = unwrapData(
		await apiPrivate.get<NormalizationMap>(`/texts/${textId}/normalizations`),
	);
	return schemas.NormalizationsGetResponseSchema.parse(data);
}

export async function postNormalization(
	textId: number,
	firstWordIndex: number,
	lastWordIndex: number,
	newToken: string,
	suggestForAll = false,
): Promise<unknown> {
	const payload = {
		first_index: firstWordIndex,
		last_index: lastWordIndex,
		new_token: newToken,
		suggest_for_all: suggestForAll,
	};

	schemas.NormalizationCreateRequestSchema.parse(payload);
	return apiPrivate.post(`/texts/${textId}/normalizations`, payload);
}

export async function deleteNormalization(
	textId: number,
	wordIndex: number,
): Promise<unknown> {
	const payload = { word_index: wordIndex };

	schemas.NormalizationDeleteRequestSchema.parse(payload);
	return apiPrivate.delete(`/texts/${textId}/normalizations`, {
		data: payload,
	});
}

export async function toggleNormalizedStatus(
	textId: number,
): Promise<MessageApiResponse> {
	const data = unwrapData(
		await apiPrivate.patch<MessageApiResponse>(
			`/texts/${textId}/normalizations`,
		),
	);
	return schemas.MessageResponseSchema.parse(data);
}

export async function toggleToBeNormalized(tokenId: number): Promise<void> {
	const payload = {
		token_id: tokenId,
	};

	await apiPrivate.patch(`/tokens/${tokenId}/suggestions/toggle`, payload);
}

export async function deleteAllNormalizations(
	textId: number,
): Promise<unknown> {
	const response = await apiPrivate.delete(
		`/texts/${textId}/normalizations/all`,
	);
	return response;
}
