import { useState } from 'react';
import PropTypes from 'prop-types';
import GeneratedEssay from './generated_essay';
import GeneratedCandidates from './generated_candidates';
import NewCorrectionPopup from './new_correction_popup';

function EssayDisplay({ essay, refreshEssay }) {
  const [selectedWordIndex, setSelectedWordIndex] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [popupIsActive, setPopupIsActive] = useState(false);

  if (!essay) {
    return <h3>Nenhum texto selecionado.</h3>;
  }


  return (
    <div>
      <h3>{essay.sourceFileName}</h3>
      <p>Responsável: {essay.teacher}</p>
      <p>Nota: <strong>{essay.grade}</strong></p>
      <p>
        {essay.candidates[selectedWordIndex] ? "Alternativas para " : null} 
        <i>{essay.candidates[selectedWordIndex] ? essay.tokens[selectedWordIndex] + ": " : null}</i>
        <strong>
          <GeneratedCandidates 
            candidates={essay.candidates[selectedWordIndex]} 
            selectedWordIndex={selectedWordIndex}
            setSelectedCandidate={setSelectedCandidate}
            setPopupIsActive={setPopupIsActive}
          />
        </strong>
      </p>
      <GeneratedEssay 
        essay={essay}
        selectedWordIndex={selectedWordIndex}
        setSelectedWordIndex={setSelectedWordIndex} 
      />
      <NewCorrectionPopup 
        essay={essay}
        candidate={selectedCandidate}
        selectedWordIndex={selectedWordIndex}
        isActive={popupIsActive}
        setSelectedCandidate={setSelectedCandidate}
        setPopupIsActive={setPopupIsActive}
        refreshEssay={refreshEssay}
      />
    </div>
  );
}

EssayDisplay.propTypes = {
  essay: PropTypes.object,
  refreshEssay: PropTypes.func,
};

export default EssayDisplay;
