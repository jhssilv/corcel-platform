import { useEffect, useRef, useState } from "react";
import FloatingCandidatesList from "./FloatingCandidatesList";
import CandidatesSidePanel from "./CandidatesSidePanel";
import { deleteNormalization, postNormalization } from "../../Api";

interface TokenPosition {
	top: number;
	left: number;
	height: number;
	width: number;
}

interface GeneratedCandidatesProps {
	candidates: string[];
	selectedStartIndex: number | null;
	selectedEndIndex: number | null;
	setSelectedCandidate: (candidate: string | null) => void;
	setPopupIsActive: (active: boolean) => void;
	selectedTokenText: string;
	singleWordSelected: boolean;
	toBeNormalized?: boolean;
	refreshEssay: () => Promise<void> | void;
	suggestForAll: boolean;
	setSuggestForAll: (value: boolean) => void;
	onClose: () => void;
	tokenId?: number;
	tokenPosition: TokenPosition | null;
	lastClickTime: number;
	essayId: number;
}

const GeneratedCandidates = ({
	candidates,
	selectedStartIndex,
	selectedEndIndex,
	setSelectedCandidate,
	setPopupIsActive,
	selectedTokenText,
	singleWordSelected,
	toBeNormalized,
	refreshEssay,
	suggestForAll,
	setSuggestForAll,
	onClose,
	tokenId,
	tokenPosition,
	lastClickTime,
	essayId,
}: GeneratedCandidatesProps) => {
	const floatingListRef = useRef<HTMLDivElement | null>(null);
	const sidePanelRef = useRef<HTMLDivElement | null>(null);
	const [showFloatingList, setShowFloatingList] = useState(true);

	useEffect(() => {
		setSuggestForAll(false);
	}, [selectedStartIndex, setSuggestForAll]);

	useEffect(() => {
		setShowFloatingList(true);
	}, [selectedStartIndex, lastClickTime]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const eventTarget = event.target as Node | null;
			if (!eventTarget) {
				return;
			}

			const isInsideFloating =
				floatingListRef.current?.contains(eventTarget) ?? false;
			const isInsidePanel =
				sidePanelRef.current?.contains(eventTarget) ?? false;

			if (isInsideFloating) {
				return;
			}

			if (isInsidePanel) {
				const targetElement =
					eventTarget instanceof Element ? eventTarget : null;
				if (
					!targetElement?.closest('[data-testid="global-suggestion-label"]')
				) {
					setShowFloatingList(false);
				}
				return;
			}

			const targetElement = eventTarget instanceof Element ? eventTarget : null;
			if (
				Boolean(targetElement?.closest('[data-testid="essay-token"]')) ||
				Boolean(
					targetElement?.closest('[data-testid="confirmation-dialog"]'),
				) ||
				Boolean(targetElement?.closest('[data-testid="confirmation-overlay"]'))
			) {
				return;
			}

			if (showFloatingList && candidates && candidates.length > 0) {
				setShowFloatingList(false);
			} else {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose, showFloatingList, candidates]);

	if (selectedStartIndex === null) {
		return null;
	}

	const handleCandidateSelection = async (candidate: string) => {
		setShowFloatingList(false);
		setSelectedCandidate(candidate);

		if (suggestForAll) {
			setPopupIsActive(true);
			return;
		}

		const effectiveEndIndex = selectedEndIndex ?? selectedStartIndex;

		if (!candidate) {
			await deleteNormalization(essayId, selectedStartIndex);
		} else {
			await postNormalization(
				essayId,
				selectedStartIndex,
				effectiveEndIndex,
				candidate,
				suggestForAll,
			);
		}

		await refreshEssay();
		setSelectedCandidate(null);
	};

	const hasCandidates = Boolean(candidates && candidates.length > 0);

	return (
		<>
			{singleWordSelected && showFloatingList && (
				<FloatingCandidatesList
					candidates={candidates}
					tokenPosition={tokenPosition}
					onSelect={handleCandidateSelection}
					onClose={() => setShowFloatingList(false)}
					forwardRef={floatingListRef}
				/>
			)}

			<CandidatesSidePanel
				selectedTokenText={selectedTokenText}
				singleWordSelected={singleWordSelected}
				toBeNormalized={toBeNormalized}
				refreshEssay={refreshEssay}
				suggestForAll={suggestForAll}
				setSuggestForAll={setSuggestForAll}
				onClose={onClose}
				tokenId={tokenId}
				onSelectCandidate={handleCandidateSelection}
				forwardRef={sidePanelRef}
				hasCandidates={hasCandidates}
			/>
		</>
	);
};

export default GeneratedCandidates;
