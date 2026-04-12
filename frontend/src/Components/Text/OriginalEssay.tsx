import styles from '../../styles/generated_essay.module.css';
import type { TextDetailResponse } from '../../types';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { SectionHeader } from '../Generic';

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
            const classNames: string[] = [styles.clickable];

            if (highlightRange && i >= highlightRange.start && i <= highlightRange.end) {
                classNames.push(styles['highlight-hover']);
            }

            spans.push(
                <span
                    key={`opt-token-${i}`}
                    className={classNames.join(' ')}
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
        <div className={`${styles['essay-container']} ${styles['original-essay-container']}`}>
            <SectionHeader heading={`${essay.sourceFileName} (Original)`} />
            <div>{renderTokens()}</div>
        </div>
    );
};

export default OriginalEssay;