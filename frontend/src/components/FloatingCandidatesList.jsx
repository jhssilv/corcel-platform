import PropTypes from 'prop-types';
import '../styles/floating_candidates_list.css';

const FloatingCandidatesList = ({ candidates, tokenPosition, onSelect, onClose, forwardRef }) => {
    if (!candidates || candidates.length === 0 || !tokenPosition) return null;

    // Helper to chunk candidates into rows of 7
    const chunkedCandidates = candidates.reduce((resultArray, item, index) => { 
        const chunkIndex = Math.floor(index / 7);
        if(!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = []; // start a new chunk
        }
        resultArray[chunkIndex].push(item);
        return resultArray;
    }, []);

    return (
        <div 
            ref={forwardRef}
            className="floating-candidates-list"
            style={{
                top: tokenPosition.top - 10,
                left: tokenPosition.left,
            }}
        >
            <div className="candidates-content">
                {chunkedCandidates.map((row, rowIndex) => (
                    <div key={rowIndex} className="candidate-row">
                        {row.map((candidate, index) => (
                            <button 
                                key={`${rowIndex}-${index}`} 
                                className="candidate-button" 
                                onClick={() => onSelect(candidate)}
                            >
                                {candidate}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

FloatingCandidatesList.propTypes = {
    candidates: PropTypes.array,
    tokenPosition: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    forwardRef: PropTypes.object
};

export default FloatingCandidatesList;
