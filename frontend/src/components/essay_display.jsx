import { useState } from 'react';
import PropTypes from 'prop-types';
import GeneratedEssay from './generated_essay';
import GeneratedCandidates from './generated_candidates';
import NewCorrectionPopup from './new_correction_popup';

function EssayDisplay({ essay, refreshEssay }) {

  const [selectedStartIndex, setSelectedStartIndex] = useState(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState(null);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [popupIsActive, setPopupIsActive] = useState(false);

  if (!essay) {
    return <h3>Nenhum texto selecionado.</h3>;
  }

  const singleWordSelected = selectedStartIndex !== null && selectedEndIndex === selectedStartIndex;
  const selectedWordHasCandidates = essay.candidates[selectedStartIndex] ? true : false;

  return (
    <div>
      <h3>{essay.sourceFileName}</h3>
      <p>Responsável: {essay.teacher}</p>
      <p>Nota: <strong>{essay.grade}</strong></p>
      <p>
        {selectedWordHasCandidates  && singleWordSelected ? "Alternativas para " : null}
        <i>{selectedWordHasCandidates && singleWordSelected? essay.tokens[selectedStartIndex] + ": " : null}</i>
        <strong>
          <GeneratedCandidates 
            candidates={essay.candidates[selectedStartIndex]} 
            selectedStartIndex={selectedStartIndex}
            selectedEndIndex={selectedEndIndex}
            setSelectedCandidate={setSelectedCandidate}
            setPopupIsActive={setPopupIsActive}
          />
        </strong>
      </p>
      <GeneratedEssay 
        essay={essay}
        selectedStartIndex={selectedStartIndex}
        setSelectedStartIndex={setSelectedStartIndex}
        selectedEndIndex={selectedEndIndex}
        setSelectedEndIndex={setSelectedEndIndex}
      />
      <NewCorrectionPopup 
        essay={essay}
        candidate={selectedCandidate}
        isActive={popupIsActive}
        selectedFirstIndex={selectedStartIndex}
        selectedLastIndex={selectedEndIndex}
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
