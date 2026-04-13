import { apiPrivate } from "./Client";
import * as schemas from "./Schemas";
import { unwrapData } from "./Utils";
import type { OCRUploadResponse } from "../types";

export async function uploadOCRArchive(file: File): Promise<OCRUploadResponse> {
	const formData = new FormData();
	formData.append("file", file);

	const response = unwrapData(
		await apiPrivate.post<OCRUploadResponse>("/ocr/upload", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
			timeout: 300000,
		}),
	);

	return schemas.OCRUploadResponseSchema.parse(response);
}

export async function getTextImage(textId: number): Promise<string | null> {
	try {
		const blob = unwrapData(
			await apiPrivate.get<Blob>(`/ocr/texts/${textId}/image`, {
				responseType: "blob",
			}),
		);

		if (!(blob instanceof Blob)) {
			console.warn("Response is not a blob", blob);
			return null;
		}

		return URL.createObjectURL(blob);
	} catch (error) {
		console.warn("Could not fetch image for text", textId, error);
		return null;
	}
}

export async function getRawTextImage(textId: number): Promise<string | null> {
	try {
		const blob = unwrapData(
			await apiPrivate.get<Blob>(`/ocr/raw-texts/${textId}/image`, {
				responseType: "blob",
			}),
		);

		if (!(blob instanceof Blob)) {
			console.warn("Response is not a blob", blob);
			return null;
		}

		return URL.createObjectURL(blob);
	} catch (error) {
		console.error("Error fetching raw text image:", error);
		return null;
	}
}

export async function updateToken(
	textId: number,
	tokenId: number,
	newValue: string,
): Promise<unknown> {
	const payload = {
		token_id: tokenId,
		new_value: newValue,
	};

	return apiPrivate.post(`/ocr/texts/${textId}/tokens`, payload);
}
