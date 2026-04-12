import { useState } from 'react';
import GeneratedEssay from './GeneratedEssay';
import OriginalEssay from './OriginalEssay';
import GeneratedCandidates from './GeneratedCandidates';
import NewCorrectionPopup from '../Modals/NewCorrectionPopup';
import ResetCorrectionsModal from '../Modals/ResetCorrectionsModal';
import { Banner, Button, Checkbox, Icon, Stack } from '../Generic';
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
    const [showResetModal, setShowResetModal] = useState(false);

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
                <Banner variant="warning" style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
                    <Icon name="Info" color="black" size={20} style={{ color: 'currentColor', flexShrink: 0 }} />
                    <div>
                        <strong>Aviso:</strong> {textNotFinishedAdvice}
                    </div>
                </Banner>
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

                <Stack alignX="center" className="essay-legend-divider" style={{ marginTop: '10px', paddingTop: '10px' }}>
                    <Checkbox
                        data-testid="finalized-toggle-input"
                        checked={essay.normalizedByUser || false}
                        onChange={() => {
                            void handleFinishedToggled();
                        }}
                        label={essay.normalizedByUser ? 'Finalizado! 🐎' : 'Marcar Como Finalizado'}
                    />
                </Stack>

                <Stack alignX="center" gap={12} style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border-secondary)', width: '100%' }}>
                    <Button
                        tier="secondary"
                        variant="danger"
                        data-testid="reset-corrections-btn"
                        onClick={() => setShowResetModal(true)}
                        leftIcon="Trash2"
                        className={styles['action-button']}
                    >
                        Excluir Normalizações
                    </Button>
                    <Button
                        tier="secondary"
                        variant={showOriginal ? 'action' : 'neutral'}
                        onClick={() => setShowOriginal(!showOriginal)}
                        leftIcon={showOriginal ? 'EyeOff' : 'SplitSquareHorizontal'}
                        className={styles['action-button']}
                    >
                        {showOriginal ? 'Ocultar Original' : 'Comparar Com Original'}
                    </Button>
                </Stack>
            </Stack>

            <ResetCorrectionsModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={handleResetCorrections}
            />

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