import type { MouseEvent as ReactMouseEvent } from 'react';
import type { NormalizationMap, TextDetailResponse } from '../../types';
import styles from '../../styles/generated_essay.module.css';

interface EssayToken {
    text: string;
    isWord: boolean;
    toBeNormalized: boolean;
    whitelisted: boolean;
    whitespaceAfter: string;
}

interface HighlightRange {
    start: number;
    end: number;
}

type HandleSelectedWordIndex = (selectedOption: number, event: ReactMouseEvent<HTMLSpanElement>) => void;

function createSpan(
    essay: TextDetailResponse,
    index: number,
    selectedStartIndex: number | null,
    selectedEndIndex: number | null,
    handleSelectedWordIndex: HandleSelectedWordIndex,
    animatedIndices: Set<number>,
    animationNonceByIndex: Record<number, number>,
    setHoveredIndex: (index: number | null) => void,
    highlightRange: HighlightRange | null,
) {
    const tokens = essay.tokens as unknown as EssayToken[];
    const corrections = (essay.corrections ?? {}) as NormalizationMap;

    const token = tokens[index];
    const correction = corrections[String(index)];
    const toBeNormalized = token.toBeNormalized;
    const whitelisted = token.whitelisted;
    const classNames: string[] = [styles.clickable];
    const tokenStates: string[] = [];

    if (correction) {
        classNames.push(styles.corrected);
        tokenStates.push('corrected');
    } else if (toBeNormalized && !whitelisted) {
        classNames.push(styles.candidates);
        tokenStates.push('candidates');
    }

    if (selectedStartIndex !== null && selectedEndIndex !== null && index >= selectedStartIndex && index <= selectedEndIndex) {
        classNames.push(styles.selected);
        tokenStates.push('selected');
    }

    if (animatedIndices.has(index)) {
        classNames.push(styles['token-updated']);
        tokenStates.push('updated');
    }

    if (highlightRange && highlightRange.start === index) {
        classNames.push(styles['highlight-hover']);
        tokenStates.push('highlighted');
    }

    const tokenText = correction ? correction.new_token : token.text;

    return (
        <span
            key={`${index}-${animationNonceByIndex[index] || 0}`}
            className={classNames.join(' ')}
            data-testid="essay-token"
            data-token-index={index}
            data-token-text={tokenText}
            data-token-state={tokenStates.join(' ')}
            onClick={(event) => {
                handleSelectedWordIndex(index, event);
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
        >
            {tokenText}
        </span>
    );
}

function buildText(
    essay: TextDetailResponse,
    selectedStartIndex: number | null,
    selectedEndIndex: number | null,
    handleSelectedWordIndex: HandleSelectedWordIndex,
    animatedIndices: Set<number>,
    animationNonceByIndex: Record<number, number>,
    setHoveredIndex: (index: number | null) => void,
    highlightRange: HighlightRange | null,
) {
    const tokens = essay.tokens as unknown as EssayToken[];
    const corrections = (essay.corrections ?? {}) as NormalizationMap;
    const spans: Array<string | JSX.Element> = [];

    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        const correction = corrections[String(i)];
        let tokenLength = 0;

        if (token.isWord) {
            spans.push(
                createSpan(
                    essay,
                    i,
                    selectedStartIndex,
                    selectedEndIndex,
                    handleSelectedWordIndex,
                    animatedIndices,
                    animationNonceByIndex,
                    setHoveredIndex,
                    highlightRange,
                ),
            );
        } else {
            spans.push(token.text);
        }

        if (token.whitespaceAfter === ' ') {
            spans.push(' ');
        }

        if (correction) {
            tokenLength = correction.last_index - i;
        }

        i += tokenLength;
    }

    return spans;
}

export default buildText;
