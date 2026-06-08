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

export interface JobStatusResponse {
	state: string;
	status: string;
	current?: number | null;
	total?: number | null;
	result?: TextUploadTaskResult | Record<string, unknown> | unknown[] | null;
	error?: string | null;
	failed_files?: string[] | null;
}

export interface TextUploadTaskResult {
	kind: "text_upload";
	batch_id: ID;
	text_ids: ID[];
	created: number;
	failed_files: string[];
}
