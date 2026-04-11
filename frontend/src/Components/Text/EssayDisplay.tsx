import { useState } from 'react';
import GeneratedEssay from './GeneratedEssay';
import OriginalEssay from './OriginalEssay';
import GeneratedCandidates from './GeneratedCandidates';
import NewCorrectionPopup from '../Modals/NewCorrectionPopup';
import { UseCorrectionActions } from '../../Hooks/Text/UseCorrectionActions';
import { UseTextSelection } from '../../Hooks/Text/UseTextSelection';
import type { TextDetailResponse } from '../../types';
import styles from '../../styles/generated_essay.module.css';
import '../../styles/user_management.css';

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

    const textNotFinishedAdvice = "Este texto ainda está sendo processado." +  
    " Tokens a serem normalizados e sugestões de normalização aparecerão em breve." +
    " Você pode trabalhar normalmente enquanto isso." 
    

    return (
        <div>
            {(essay.processingStatus === 'PROCESSING' || essay.processingStatus === 'PENDING') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff3cd', border: '1px solid #ffe69c', color: '#664d03', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.95rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                    </svg>
                    <div>
                        <strong>Aviso:</strong> {textNotFinishedAdvice}
                    </div>
                </div>
            )}
            <div className="essay-legend">
                <div className="essay-legend-items">
                    <div className="essay-legend-item">
                        <span className="essay-legend-swatch essay-legend-swatch--danger"></span>
                        <span>Não Normalizado</span>
                    </div>
                    <div className="essay-legend-item">
                        <span className="essay-legend-swatch essay-legend-swatch--info"></span>
                        <span>Substituído</span>
                    </div>
                    <div className="essay-legend-item">
                        <span className="essay-legend-swatch essay-legend-swatch--neutral"></span>
                        <span>Selecionado</span>
                    </div>
                </div>
                <div className="essay-legend-hint">
                    <span>
                        Segure <strong>Ctrl</strong> para selecionar múltiplos tokens.
                    </span>
                </div>

                <div className={`${styles['finalized-toggle-wrapper']} essay-legend-divider`}>
                    <label className={styles['finalized-toggle']}>
                        <input
                            data-testid="finalized-toggle-input"
                            type="checkbox"
                            checked={essay.normalizedByUser || false}
                            onChange={() => {
                                void handleFinishedToggled();
                            }}
                        />
                        <span className={styles['toggle-slider']}></span>
                        <span className={styles['toggle-label']}>
                            {essay.normalizedByUser ? 'Finalizado! 🐎' : 'Marcar Como Finalizado'}
                        </span>
                    </label>
                </div>

                <div className="essay-actions-bar">
                    <button
                        data-testid="reset-corrections-btn"
                        className="essay-action-btn--danger"
                        onClick={() => {
                            void handleResetCorrections();
                        }}
                    >
                        Excluir Normalizações
                    </button>
                    <button
                        onClick={() => setShowOriginal(!showOriginal)}
                        className={`essay-action-btn--secondary ${showOriginal ? 'active' : ''}`}
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

            <div className={showOriginal ? styles['essay-comparison-container'] : ''}>
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