import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import GeneratedEssay from './GeneratedEssay';
import GeneratedCandidates from './GeneratedCandidates';
import NewCorrectionPopup from './NewCorrectionPopup';
import { toggleNormalizedStatus } from './api/APIFunctions';

function EssayDisplay({ essay, refreshEssay }) {

  const [selectedStartIndex, setSelectedStartIndex] = useState(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState(null);
  const [tokenPosition, setTokenPosition] = useState(null);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [popupIsActive, setPopupIsActive] = useState(false);
  const [suggestForAll, setSuggestForAll] = useState(false);

  useEffect(() => {
    setSelectedStartIndex(null);
    setSelectedEndIndex(null);
    setSuggestForAll(false);
  }, [essay?.sourceFileName]);

  if (!essay) {
    return <h3>Nenhum texto selecionado.</h3>;
  }

  const handleFinishedToggled = async () => {
    await toggleNormalizedStatus(essay.id);
    refreshEssay();
  };

  const singleWordSelected = selectedStartIndex !== null && selectedEndIndex === selectedStartIndex;
  const selectedWordHasCandidates = selectedStartIndex !== null && essay.tokens[selectedStartIndex] && essay.tokens[selectedStartIndex].candidates ? true : false;
  const candidates = essay.tokens[selectedStartIndex] ? essay.tokens[selectedStartIndex]["candidates"] : [];
  
  const selectedTokenText = (() => {
    if (selectedStartIndex === null) return "";
    let text = "";
    for (let i = selectedStartIndex; i <= selectedEndIndex; i++) {
        if (essay.tokens[i]) {
            text += essay.tokens[i].text;
            if (i < selectedEndIndex && essay.tokens[i].whitespaceAfter) {
                text += essay.tokens[i].whitespaceAfter;
            }
        }
    }
    return text;
  })();

  return (
    <div>
      
      <div style={{ 
        marginBottom: '15px', 
        padding: '15px', 
        backgroundColor: '#2b2b2b', 
        borderRadius: '8px', 
        fontSize: '0.9em',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        border: '1px solid #444'
      }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', marginRight: '8px', borderRadius: '2px' }}></span>
                <span>Não Normalizado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', marginRight: '8px', borderRadius: '2px' }}></span>
                <span>Substituído</span>
            </div>
             <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: '#e4e4e7', marginRight: '8px', borderRadius: '2px' }}></span>
                <span>Selecionado</span>
            </div>
        </div>
        <div style={{ textAlign: 'center', color: '#ccc' }}>
            <span>Segure <strong>Ctrl</strong> para selecionar múltiplos tokens.</span>
        </div>

        <div className="finalized-toggle-wrapper" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444', width: '100%', justifyContent: 'center' }}>
            <label className="finalized-toggle">
                <input
                    type="checkbox"
                    checked={essay.normalizedByUser || false}
                    onChange={handleFinishedToggled}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">{
                  essay.normalizedByUser ? "Finalizado! 🐎" : "Marcar Como Finalizado"
                }</span>
            </label>
        </div>
      </div>

      <GeneratedCandidates 
        candidates={candidates}
        selectedStartIndex={selectedStartIndex}
        selectedEndIndex={selectedEndIndex}
        setSelectedCandidate={setSelectedCandidate}
        setPopupIsActive={setPopupIsActive}
        selectedTokenText={selectedTokenText}
        singleWordSelected={singleWordSelected}
        toBeNormalized={essay.tokens[selectedStartIndex]?.toBeNormalized}
        refreshEssay={refreshEssay}
        suggestForAll={suggestForAll}
        setSuggestForAll={setSuggestForAll}
        onClose={() => {
          setSelectedStartIndex(null);
          setSelectedEndIndex(null);
        }}
        tokenId={essay.tokens[selectedStartIndex]?.id}
        tokenPosition={tokenPosition}
      />

      <GeneratedEssay 
        essay={essay}
        selectedStartIndex={selectedStartIndex}
        setSelectedStartIndex={setSelectedStartIndex}
        selectedEndIndex={selectedEndIndex}
        setSelectedEndIndex={setSelectedEndIndex}
        setTokenPosition={setTokenPosition}
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
        suggestForAll={suggestForAll}
        clearSelection={() => {
          setSelectedStartIndex(null);
          setSelectedEndIndex(null);
        }}
        tokenPosition={tokenPosition}
      />
    </div>
  );
}

EssayDisplay.propTypes = {
  essay: PropTypes.object,
  refreshEssay: PropTypes.func,
};

export default EssayDisplay;
