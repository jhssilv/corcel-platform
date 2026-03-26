import { useState, type Ref } from 'react';
import '../styles/floating_candidates_list.css';

interface TokenPosition {
  top: number;
  left: number;
  height: number;
  width: number;
}

interface FloatingCandidatesListProps {
  candidates: string[];
  tokenPosition: TokenPosition | null;
  onSelect: (candidate: string) => void;
  onClose: () => void;
  forwardRef?: Ref<HTMLDivElement>;
}

const FloatingCandidatesList = ({ candidates, tokenPosition, onSelect, onClose, forwardRef }: FloatingCandidatesListProps) => {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  void onClose;

  if (!candidates || candidates.length === 0 || !tokenPosition) {
    return null;
  }

  const handleCandidateClick = (candidate: string) => {
    setSelectedCandidate(candidate);
    onSelect(candidate);
  };

  const chunkedCandidates = candidates.reduce<string[][]>((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / 7);
    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [];
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
                className={`candidate-button ${selectedCandidate === candidate ? 'selected' : ''}`}
                onClick={() => handleCandidateClick(candidate)}
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

export default FloatingCandidatesList;