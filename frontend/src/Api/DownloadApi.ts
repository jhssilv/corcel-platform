import { saveAs } from "file-saver";
import { apiBlob } from "./Client";
import type { DownloadRequest } from "../types";

interface DownloadResult {
	success: true;
	filename: string;
}

export async function requestDownload(
	textIds: number[],
	useTags: boolean,
): Promise<DownloadResult> {
	const payload: DownloadRequest = {
		text_ids: textIds,
		use_tags: useTags,
	};

	const response = await apiBlob.post<Blob>("/download/", payload, {
		responseType: "blob",
		headers: {
			"Content-Type": "application/json",
		},
	});

	const filename = "normalized_texts.zip";
	saveAs(response.data, filename);

	return { success: true, filename };
}

export async function requestReport(textIds: number[]): Promise<void> {
	const payload = {
		text_ids: textIds,
	};

	const response = await apiBlob.post<Blob>("/report/", payload, {
		responseType: "blob",
		headers: {
			"Content-Type": "application/json",
		},
	});

	saveAs(response.data, "report.csv");
}
