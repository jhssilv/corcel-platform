import '../../styles/generated_essay.css';
import type { TextDetailResponse } from '../../types';
import type { MouseEvent as ReactMouseEvent } from 'react';

interface HighlightRange {
    start: number;
    end: number;
}

interface EssayToken {
    text: string;
    whitespaceAfter: string;
}

interface OriginalEssayProps {
    essay: TextDetailResponse;
    handleSelection?: (index: number, event: ReactMouseEvent<HTMLSpanElement>) => void;
    highlightRange: HighlightRange | null;
    setHoveredIndex: (index: number | null) => void;
}

const OriginalEssay = ({ essay, handleSelection, highlightRange, setHoveredIndex }: OriginalEssayProps) => {
    const tokens = (essay.tokens ?? []) as unknown as EssayToken[];

    if (!essay || tokens.length === 0) {
        return null;
    }

    const renderTokens = () => {
        const spans: Array<string | JSX.Element> = [];

        for (let i = 0; i < tokens.length; i += 1) {
            const token = tokens[i];
            let className = 'clickable';

            if (highlightRange && i >= highlightRange.start && i <= highlightRange.end) {
                className += ' highlight-hover';
            }

            spans.push(
                <span
                    key={`opt-token-${i}`}
                    className={className}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={(event) => handleSelection?.(i, event)}
                >
                    {token.text}
                </span>,
            );

            if (token.whitespaceAfter) {
                spans.push(token.whitespaceAfter);
            }
        }

        return spans;
    };

    return (
        <div className="essay-container original-essay-container">
            <div className="document-header">
                <span className="document-title">{essay.sourceFileName} (Original)</span>
            </div>
            <div className="document-body">{renderTokens()}</div>
        </div>
    );
};

export default OriginalEssay;