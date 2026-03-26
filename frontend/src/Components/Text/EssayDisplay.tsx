import { useState } from 'react';
import GeneratedEssay from './GeneratedEssay';
import OriginalEssay from './OriginalEssay';
import GeneratedCandidates from './GeneratedCandidates';
import NewCorrectionPopup from '../Modals/NewCorrectionPopup';
import { UseCorrectionActions } from '../../Hooks/Text/UseCorrectionActions';
import { UseTextSelection } from '../../Hooks/Text/UseTextSelection';
import type { TextDetailResponse } from '../../types';

interface EssayDisplayProps {
    essay: TextDetailResponse | null;
    refreshEssay: () => Promise<void> | void;
}

function EssayDisplay({ essay, refreshEssay }: EssayDisplayProps) {
    const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
    const [popupIsActive, setPopupIsActive] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);

    const {
        selectedStartIndex,
        setSelectedStartIndex,
        selectedEndIndex,
        setSelectedEndIndex,
        tokenPosition,
        setTokenPosition,
        lastClickTime,
        setLastClickTime,
        setHoveredIndex,
        suggestForAll,
        setSuggestForAll,
        singleWordSelected,
        candidates,
        selectedTokenText,
        selectedToken,
        highlightRange,
        resetSelection,
    } = UseTextSelection(essay);

    const { handleFinishedToggled, handleResetCorrections } = UseCorrectionActions(essay, refreshEssay);

    if (!essay) {
        return <h3>Nenhum texto selecionado.</h3>;
    }

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
                onClose={resetSelection}
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
                clearSelection={resetSelection}
                tokenPosition={tokenPosition}
            />
        </div>
    );
}

export default EssayDisplay;