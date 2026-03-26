import { useEffect, useMemo, useState } from 'react';
import GeneratedEssay from './GeneratedEssay';
import OriginalEssay from './OriginalEssay';
import GeneratedCandidates from './GeneratedCandidates';
import NewCorrectionPopup from './NewCorrectionPopup';
import { deleteAllNormalizations, toggleNormalizedStatus } from './api/APIFunctions';
import type { NormalizationMap, TextDetailResponse } from '../types';

interface TokenPosition {
  top: number;
  left: number;
  height: number;
  width: number;
}

interface HighlightRange {
  start: number;
  end: number;
}

interface EssayToken {
  id: number;
  text: string;
  candidates: string[];
  toBeNormalized: boolean;
  whitespaceAfter: string;
}

interface EssayDisplayProps {
  essay: TextDetailResponse | null;
  refreshEssay: () => Promise<void> | void;
}

function EssayDisplay({ essay, refreshEssay }: EssayDisplayProps) {
  const [selectedStartIndex, setSelectedStartIndex] = useState<number | null>(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState<number | null>(null);
  const [tokenPosition, setTokenPosition] = useState<TokenPosition | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [popupIsActive, setPopupIsActive] = useState(false);
  const [suggestForAll, setSuggestForAll] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const tokens = (essay?.tokens ?? []) as unknown as EssayToken[];

  useEffect(() => {
    setSelectedStartIndex(null);
    setSelectedEndIndex(null);
    setSuggestForAll(false);
  }, [essay?.sourceFileName]);

  const highlightRange = useMemo<HighlightRange | null>(() => {
    if (hoveredIndex === null || !essay?.tokens) {
      return null;
    }

    let start = hoveredIndex;
    let end = hoveredIndex;
    const corrections = (essay.corrections ?? {}) as NormalizationMap;

    const directCorrection = corrections[String(hoveredIndex)];
    if (directCorrection) {
      end = directCorrection.last_index;
    } else {
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
    await refreshEssay();
  };

  const handleResetCorrections = async () => {
    if (!window.confirm('Tem certeza de que deseja excluir todas as normalizações para este texto?')) {
      return;
    }

    try {
      await deleteAllNormalizations(essay.id);
      await refreshEssay();
    } catch (error) {
      console.error('Failed to delete all normalizations:', error);
      alert('Falha ao excluir normalizações.');
    }
  };

  const singleWordSelected = selectedStartIndex !== null && selectedEndIndex === selectedStartIndex;
  const candidates = selectedStartIndex !== null ? (tokens[selectedStartIndex]?.candidates ?? []) : [];

  const selectedTokenText = (() => {
    if (selectedStartIndex === null) {
      return '';
    }

    const effectiveEndIndex = selectedEndIndex ?? selectedStartIndex;
    let text = '';

    for (let i = selectedStartIndex; i <= effectiveEndIndex; i += 1) {
      const token = tokens[i];
      if (!token) {
        continue;
      }

      text += token.text;
      if (i < effectiveEndIndex && token.whitespaceAfter) {
        text += token.whitespaceAfter;
      }
    }

    return text;
  })();

  const selectedToken = selectedStartIndex !== null ? tokens[selectedStartIndex] : undefined;

  return (
    <div>
      <div
        style={{
          marginBottom: '15px',
          padding: '15px',
          backgroundColor: '#2b2b2b',
          borderRadius: '8px',
          fontSize: '0.9em',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid #444',
        }}
      >
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
          <span>
            Segure <strong>Ctrl</strong> para selecionar múltiplos tokens.
          </span>
        </div>

        <div className="finalized-toggle-wrapper" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444', width: '100%', justifyContent: 'center' }}>
          <label className="finalized-toggle">
            <input
              type="checkbox"
              checked={essay.normalizedByUser || false}
              onChange={() => {
                void handleFinishedToggled();
              }}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">
              {essay.normalizedByUser ? 'Finalizado! 🐎' : 'Marcar Como Finalizado'}
            </span>
          </label>
        </div>

        <div style={{ marginTop: '10px', borderTop: '1px solid #444', width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '10px', gap: '10px' }}>
          <button
            className="reset-corrections-btn"
            onClick={() => {
              void handleResetCorrections();
            }}
            style={{
              background: 'none',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85em',
            }}
          >
            Excluir Normalizações
          </button>
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            style={{
              background: 'none',
              border: '1px solid #555',
              color: showOriginal ? '#646cff' : '#aaa',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85em',
            }}
          >
            {showOriginal ? 'Ocultar Original' : 'Comparar Com Original'}
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
        toBeNormalized={selectedToken?.toBeNormalized}
        refreshEssay={refreshEssay}
        suggestForAll={suggestForAll}
        setSuggestForAll={setSuggestForAll}
        onClose={() => {
          setSelectedStartIndex(null);
          setSelectedEndIndex(null);
        }}
        tokenId={selectedToken?.id}
        tokenPosition={tokenPosition}
        lastClickTime={lastClickTime}
        essayId={essay.id}
      />

      <div className={showOriginal ? 'essay-comparison-container' : ''}>
        {showOriginal && (
          <OriginalEssay
            essay={essay}
            highlightRange={highlightRange}
            setHoveredIndex={setHoveredIndex}
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
        candidate={selectedCandidate ?? ''}
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

export default EssayDisplay;