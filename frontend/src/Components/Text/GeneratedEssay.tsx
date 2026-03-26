import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import buildText from '../../Services/Text/BuildText';
import '../../styles/generated_essay.css';
import type { NormalizationMap, TextDetailResponse } from '../../types';

interface TokenPosition {
    top: number;
    left: number;
    height: number;
    width: number;
}

interface HighlightRange {
    start: number;
    end: number;
}

interface CorrectionValue {
    last_index: number;
    new_token: string;
}

interface GeneratedEssayProps {
    essay: TextDetailResponse;
    selectedStartIndex: number | null;
    setSelectedStartIndex: (value: number | null) => void;
    selectedEndIndex: number | null;
    setSelectedEndIndex: (value: number | null) => void;
    setTokenPosition: (value: TokenPosition | null) => void;
    setLastClickTime: (value: number) => void;
    setHoveredIndex: (value: number | null) => void;
    highlightRange: HighlightRange | null;
}

const GeneratedEssay = ({
    essay,
    selectedStartIndex,
    setSelectedStartIndex,
    selectedEndIndex,
    setSelectedEndIndex,
    setTokenPosition,
    setLastClickTime,
    setHoveredIndex,
    highlightRange,
}: GeneratedEssayProps) => {
    const [animatedIndices, setAnimatedIndices] = useState<Set<number>>(new Set());
    const [animationNonceByIndex, setAnimationNonceByIndex] = useState<Record<number, number>>({});
    const previousCorrectionsRef = useRef<NormalizationMap>({});
    const animationTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        const previousCorrections = previousCorrectionsRef.current || {};
        const currentCorrections = (essay?.corrections || {}) as NormalizationMap;
        const changedIndices = new Set<number>();

        const addRange = (start: number | string, end: number | undefined) => {
            const safeStart = Number(start);
            const safeEnd = Number(end ?? start);
            const from = Math.min(safeStart, safeEnd);
            const to = Math.max(safeStart, safeEnd);

            for (let i = from; i <= to; i += 1) {
                changedIndices.add(i);
            }
        };

        Object.keys(currentCorrections).forEach((key) => {
            const index = Number(key);
            const previous = previousCorrections[key] as CorrectionValue | undefined;
            const current = currentCorrections[key] as CorrectionValue | undefined;

            if (!current || !previous || previous.last_index !== current.last_index || previous.new_token !== current.new_token) {
                addRange(index, current?.last_index);
            }
        });

        Object.keys(previousCorrections).forEach((key) => {
            if (!currentCorrections[key]) {
                const previous = previousCorrections[key] as CorrectionValue | undefined;
                addRange(key, previous?.last_index);
            }
        });

        if (changedIndices.size > 0) {
            setAnimatedIndices((prev) => {
                const next = new Set(prev);
                changedIndices.forEach((index) => next.add(index));
                return next;
            });

            setAnimationNonceByIndex((prev) => {
                const next = { ...prev };
                changedIndices.forEach((index) => {
                    next[index] = (next[index] || 0) + 1;
                });
                return next;
            });

            changedIndices.forEach((index) => {
                if (animationTimeoutsRef.current[index]) {
                    clearTimeout(animationTimeoutsRef.current[index]);
                }

                animationTimeoutsRef.current[index] = setTimeout(() => {
                    setAnimatedIndices((prev) => {
                        const next = new Set(prev);
                        next.delete(index);
                        return next;
                    });
                }, 850);
            });
        }

        previousCorrectionsRef.current = currentCorrections;
    }, [essay?.corrections]);

    useEffect(() => {
        const timeouts = animationTimeoutsRef.current;

        return () => {
            Object.values(timeouts).forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
        };
    }, []);

    const handleSelectedWordIndex = (selectedOption: number, event?: ReactMouseEvent<HTMLSpanElement>) => {
        if (event?.target) {
            const target = event.target as HTMLElement;
            const rect = target.getBoundingClientRect();
            setTokenPosition({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                height: rect.height,
                width: rect.width,
            });
        }

        const isMultiSelect = Boolean(event?.ctrlKey || event?.metaKey);

        if (isMultiSelect) {
            if (selectedStartIndex === null) {
                setSelectedStartIndex(selectedOption);
                setSelectedEndIndex(selectedOption);
            } else if (selectedOption < selectedStartIndex) {
                setSelectedStartIndex(selectedOption);
            } else {
                setSelectedEndIndex(selectedOption);
            }
        } else {
            setSelectedStartIndex(selectedOption);
            setSelectedEndIndex(selectedOption);
            setLastClickTime(Date.now());
        }
    };

    const spans = buildText(
        essay,
        selectedStartIndex,
        selectedEndIndex,
        handleSelectedWordIndex,
        animatedIndices,
        animationNonceByIndex,
        setHoveredIndex,
        highlightRange,
    );

    return (
        <div className="essay-container" data-testid="essay-container">
            <div className="document-header">
                <span className="document-title" data-testid="document-title">{essay.sourceFileName}</span>
                {essay.grade !== undefined && essay.grade !== null && (
                    <span className="document-grade">Nota: {essay.grade}</span>
                )}
            </div>
            <div className="document-body">{spans}</div>
        </div>
    );
};

export default GeneratedEssay;