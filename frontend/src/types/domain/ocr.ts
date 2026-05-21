import type { ID, Nullable } from "./common";

export interface RawTextMetadata {
	id: ID;
	sourceFileName: Nullable<string>;
}

export interface RawTextDetail {
	id: ID;
	source_file_name: Nullable<string>;
	text_content: string;
	image_path?: string | null;
}

export interface TaskStatusResponse {
	state: string;
	status: string;
	current?: number;
	total?: number;
	result?: TextUploadTaskResult | Record<string, unknown> | unknown[];
	error?: string;
	failed_files?: string[];
}

export interface TextUploadTaskResult {
	kind: "text_upload";
	text_ids: ID[];
	processed: number;
	failed_files: string[];
}
