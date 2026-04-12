import { useState } from 'react';
import GeneratedEssay from './GeneratedEssay';
import OriginalEssay from './OriginalEssay';
import GeneratedCandidates from './GeneratedCandidates';
import NewCorrectionPopup from '../Modals/NewCorrectionPopup';
import { Icon, Stack } from '../Generic';
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
                <Stack alignY="center" gap={12} style={{ background: '#fff3cd', border: '1px solid #ffe69c', color: '#664d03', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.95rem' }}>
                    <Icon name="Info" color="black" size={20} style={{ color: 'currentColor', flexShrink: 0 }} />
                    <div>
                        <strong>Aviso:</strong> {textNotFinishedAdvice}
                    </div>
                </Stack>
            )}
            <Stack direction="vertical" alignY="center" gap={12} className="essay-legend">
                <Stack alignX="center" gap={20} className="essay-legend-items" wrap>
                    <Stack alignY="center" className="essay-legend-item">
                        <span className="essay-legend-swatch essay-legend-swatch--danger"></span>
                        <span>Não Normalizado</span>
                    </Stack>
                    <Stack alignY="center" className="essay-legend-item">
                        <span className="essay-legend-swatch essay-legend-swatch--info"></span>
                        <span>Substituído</span>
                    </Stack>
                    <Stack alignY="center" className="essay-legend-item">
                        <span className="essay-legend-swatch essay-legend-swatch--neutral"></span>
                        <span>Selecionado</span>
                    </Stack>
                </Stack>
                <div className="essay-legend-hint">
                    <span>
                        Segure <strong>Ctrl</strong> para selecionar múltiplos tokens.
                    </span>
                </div>

                <Stack alignX="center" className={`${styles['finalized-toggle-wrapper']} essay-legend-divider`} style={{ marginTop: '10px', paddingTop: '10px' }}>
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
                </Stack>

                <Stack alignX="center" gap={12} className="essay-actions-bar" style={{ marginTop: '10px', paddingTop: '10px' }}>
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
                </Stack>
            </Stack>

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