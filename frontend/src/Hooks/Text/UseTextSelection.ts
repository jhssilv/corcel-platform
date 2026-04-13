import { useEffect, useMemo, useState } from "react";
import type { NormalizationMap, TextDetailResponse } from "../../types";

export interface TokenPosition {
	top: number;
	left: number;
	height: number;
	width: number;
}

export interface HighlightRange {
	start: number;
	end: number;
}

interface EssayToken {
	id: number;
	text: string;
	candidates: string[];
	toBeNormalized: boolean;
	whitespaceAfter: string;
}

interface UseTextSelectionResult {
	selectedStartIndex: number | null;
	setSelectedStartIndex: (value: number | null) => void;
	selectedEndIndex: number | null;
	setSelectedEndIndex: (value: number | null) => void;
	tokenPosition: TokenPosition | null;
	setTokenPosition: (value: TokenPosition | null) => void;
	lastClickTime: number;
	setLastClickTime: (value: number) => void;
	hoveredIndex: number | null;
	setHoveredIndex: (value: number | null) => void;
	suggestForAll: boolean;
	setSuggestForAll: (value: boolean) => void;
	singleWordSelected: boolean;
	candidates: string[];
	selectedTokenText: string;
	selectedToken: EssayToken | undefined;
	highlightRange: HighlightRange | null;
	resetSelection: () => void;
}

export function UseTextSelection(
	essay: TextDetailResponse | null,
): UseTextSelectionResult {
	const [selectedStartIndex, setSelectedStartIndex] = useState<number | null>(
		null,
	);
	const [selectedEndIndex, setSelectedEndIndex] = useState<number | null>(null);
	const [tokenPosition, setTokenPosition] = useState<TokenPosition | null>(
		null,
	);
	const [lastClickTime, setLastClickTime] = useState(0);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [suggestForAll, setSuggestForAll] = useState(false);

	const tokens = useMemo(() => {
		return (essay?.tokens ?? []) as unknown as EssayToken[];
	}, [essay?.tokens]);

	useEffect(() => {
		setSelectedStartIndex(null);
		setSelectedEndIndex(null);
		setSuggestForAll(false);
	}, [essay?.sourceFileName]);

	const highlightRange = useMemo<HighlightRange | null>(() => {
		if (hoveredIndex === null || !essay?.tokens) {
			return null;
		}

		let start = hoveredIndex;
		let end = hoveredIndex;
		const corrections = (essay.corrections ?? {}) as NormalizationMap;

		const directCorrection = corrections[String(hoveredIndex)];
		if (directCorrection) {
			end = directCorrection.last_index;
		} else {
			const entries = Object.entries(corrections) as Array<
				[string, NormalizationMap[string]]
			>;
			for (const [key, correction] of entries) {
				const correctionStart = Number(key);
				if (
					hoveredIndex >= correctionStart &&
					hoveredIndex <= correction.last_index
				) {
					start = correctionStart;
					end = correction.last_index;
					break;
				}
			}
		}

		return { start, end };
	}, [hoveredIndex, essay?.corrections, essay?.tokens]);

	const singleWordSelected =
		selectedStartIndex !== null && selectedEndIndex === selectedStartIndex;

	const candidates =
		selectedStartIndex !== null
			? (tokens[selectedStartIndex]?.candidates ?? [])
			: [];

	const selectedTokenText = useMemo(() => {
		if (selectedStartIndex === null) {
			return "";
		}

		const effectiveEndIndex = selectedEndIndex ?? selectedStartIndex;
		let text = "";

		for (let i = selectedStartIndex; i <= effectiveEndIndex; i += 1) {
			const token = tokens[i];
			if (!token) {
				continue;
			}

			text += token.text;
			if (i < effectiveEndIndex && token.whitespaceAfter) {
				text += token.whitespaceAfter;
			}
		}

		return text;
	}, [selectedStartIndex, selectedEndIndex, tokens]);

	const selectedToken =
		selectedStartIndex !== null ? tokens[selectedStartIndex] : undefined;

	const resetSelection = () => {
		setSelectedStartIndex(null);
		setSelectedEndIndex(null);
	};

	return {
		selectedStartIndex,
		setSelectedStartIndex,
		selectedEndIndex,
		setSelectedEndIndex,
		tokenPosition,
		setTokenPosition,
		lastClickTime,
		setLastClickTime,
		hoveredIndex,
		setHoveredIndex,
		suggestForAll,
		setSuggestForAll,
		singleWordSelected,
		candidates,
		selectedTokenText,
		selectedToken,
		highlightRange,
		resetSelection,
	};
}
