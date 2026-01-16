import PropTypes from 'prop-types';
import '../styles/generated_essay.css';

const OriginalEssay = ({ 
    essay, 
    selectedStartIndex, 
    handleSelection, // Function to handle selection logic (optional/bonus)
    highlightRange,
    setHoveredIndex
}) => {

    if (!essay || !essay.tokens) return null;

    const renderTokens = () => {
        const spans = [];
        for (let i = 0; i < essay.tokens.length; i++) {
            const token = essay.tokens[i];
            let className = "clickable";

            // Determine if highlighted based on hover
            if (highlightRange && i >= highlightRange.start && i <= highlightRange.end) {
                className += " highlight-hover";
            }

            spans.push(
                <span 
                    key={`opt-token-${i}`} 
                    className={className}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={(e) => handleSelection && handleSelection(i, e)}
                >
                    {token.text}
                </span>
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
            <div className="document-body">
                {renderTokens()}
            </div>
        </div>
    );
};

OriginalEssay.propTypes = {
    essay: PropTypes.object.isRequired,
    selectedStartIndex: PropTypes.number,
    handleSelection: PropTypes.func,
    highlightRange: PropTypes.object,
    setHoveredIndex: PropTypes.func.isRequired
};

export default OriginalEssay;
