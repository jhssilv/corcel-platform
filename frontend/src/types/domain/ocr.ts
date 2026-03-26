import type { ID, Nullable } from './common';

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

export interface OCRUploadResponse {
  task_id: string;
}

export interface TaskStatusResponse {
  state: string;
  status: string;
  current?: number;
  total?: number;
  result?: unknown;
  error?: string;
  failed_files?: string[];
}
