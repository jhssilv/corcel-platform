import type { ID, Nullable } from "./common";
import type { NormalizationMap } from "./normalization";
import type { TokenDetailItem } from "./token";

export interface TextMetadata {
	id: ID;
	grade: Nullable<number>;
	usersAssigned: string[];
	normalizedByUser: boolean;
	sourceFileName: Nullable<string>;
	isRaw?: boolean;
	processingStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED";
}

export interface TextDetail {
	id: ID;
	grade: Nullable<number>;
	tokens: TokenDetailItem[];
	normalizedByUser: boolean;
	sourceFileName: Nullable<string>;
	assignedToUser: boolean;
	usersWhoNormalized: string[];
	isRaw?: boolean;
	corrections?: NormalizationMap;
	processingStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED";
}

export interface TextSelection {
	selectedStartIndex: number | null;
	selectedEndIndex: number | null;
}
