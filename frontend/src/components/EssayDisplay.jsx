import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import GeneratedEssay from './GeneratedEssay';
import OriginalEssay from './OriginalEssay'; // Import the new component
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
  const [lastClickTime, setLastClickTime] = useState(0);

  // New state for Original Essay view
  const [showOriginal, setShowOriginal] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    setSelectedStartIndex(null);
    setSelectedEndIndex(null);
    setSuggestForAll(false);
    // setHoveredIndex(null); // Optional: reset hover on essay change
  }, [essay?.sourceFileName]);

  const highlightRange = useMemo(() => {
    if (hoveredIndex === null || !essay?.tokens) return null;

    // Default range is just the hovered token
    let start = hoveredIndex;
    let end = hoveredIndex;

    const corrections = essay.corrections || {};
    
    // Check if hoveredIndex is a start of a correction
    if (corrections[hoveredIndex]) {
        end = corrections[hoveredIndex].last_index;
    } else {
        // Check if hoveredIndex is inside a correction range
        // This scan could be optimized, but essay length is usually small enough
        for (const [key, correction] of Object.entries(corrections)) {
            const correctionStart = Number(key);
            if (hoveredIndex >= correctionStart && hoveredIndex <= correction.last_index) {
                start = correctionStart;
                end = correction.last_index;
                break;
            }
        }
    }

    return { start, end };
  }, [hoveredIndex, essay?.corrections, essay?.tokens]);

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
    const effectiveEndIndex = selectedEndIndex ?? selectedStartIndex;
    let text = "";
    for (let i = selectedStartIndex; i <= effectiveEndIndex; i++) {
        if (essay.tokens[i]) {
            text += essay.tokens[i].text;
            if (i < effectiveEndIndex && essay.tokens[i].whitespaceAfter) {
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
        
        <div style={{ marginTop: '10px', borderTop: '1px solid #444', width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
            <button 
                onClick={() => setShowOriginal(!showOriginal)}
                style={{
                    background: 'none',
                    border: '1px solid #555',
                    color: showOriginal ? '#646cff' : '#aaa',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85em'
                }}
            >
                {showOriginal ? "Ocultar Original" : "Mostrar Original Lado a Lado"}
            </button>
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
        lastClickTime={lastClickTime}
        essayId={essay.id}
      />

        <div className={showOriginal ? "essay-comparison-container" : ""}>
          {showOriginal && (
              <OriginalEssay
                  essay={essay}
                  highlightRange={highlightRange}
                  setHoveredIndex={setHoveredIndex}
                  // We can support selection here too if we wire it up, but for now just viewing
                  // handleSelection={(index) => { setSelectedStartIndex(index); setSelectedEndIndex(index); }}
              />
          )}

          <GeneratedEssay 
            essay={essay}
            selectedStartIndex={selectedStartIndex}
            setSelectedStartIndex={setSelectedStartIndex}
            selectedEndIndex={selectedEndIndex}
            setSelectedEndIndex={setSelectedEndIndex}
            setTokenPosition={setTokenPosition}
            setLastClickTime={setLastClickTime}
            setHoveredIndex={setHoveredIndex}
            highlightRange={highlightRange}
          />
      </div>
      
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
