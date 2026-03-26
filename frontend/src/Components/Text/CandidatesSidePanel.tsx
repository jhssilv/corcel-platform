import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent, type MutableRefObject, type Ref } from 'react';
import styles from '../../styles/candidates_side_panel.module.css';
import { toggleToBeNormalized } from '../../Api';

interface PanelPosition {
    left: number;
    top: number;
}

interface DragState {
    dragging: boolean;
    offsetX: number;
    offsetY: number;
}

interface CandidatesSidePanelProps {
    selectedTokenText: string;
    singleWordSelected: boolean;
    toBeNormalized?: boolean;
    refreshEssay: () => Promise<void> | void;
    suggestForAll: boolean;
    setSuggestForAll: (value: boolean) => void;
    onClose: () => void;
    tokenId?: number;
    onSelectCandidate: (candidate: string) => void;
    forwardRef?: Ref<HTMLDivElement>;
    hasCandidates: boolean;
}

const CandidatesSidePanel = ({
    selectedTokenText,
    singleWordSelected,
    toBeNormalized,
    refreshEssay,
    suggestForAll,
    setSuggestForAll,
    onClose,
    tokenId,
    onSelectCandidate,
    forwardRef,
    hasCandidates,
}: CandidatesSidePanelProps) => {
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<DragState>({ dragging: false, offsetX: 0, offsetY: 0 });
    const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(() => {
        try {
            const raw = localStorage.getItem('candidatesPanelPosition');
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw) as Partial<PanelPosition>;
            if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
                return { left: parsed.left, top: parsed.top };
            }

            return null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!dragStateRef.current.dragging || !panelRef.current) {
                return;
            }

            const panelRect = panelRef.current.getBoundingClientRect();
            const panelWidth = panelRect.width;
            const panelHeight = panelRect.height;

            const nextLeft = event.clientX - dragStateRef.current.offsetX;
            const nextTop = event.clientY - dragStateRef.current.offsetY;

            const minLeft = 8;
            const minTop = 68;
            const maxLeft = Math.max(minLeft, window.innerWidth - panelWidth - 8);
            const maxTop = Math.max(minTop, window.innerHeight - panelHeight - 8);

            const clampedLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);
            const clampedTop = Math.min(Math.max(nextTop, minTop), maxTop);

            setPanelPosition({ left: clampedLeft, top: clampedTop });
        };

        const handleMouseUp = () => {
            if (!dragStateRef.current.dragging) {
                return;
            }

            dragStateRef.current.dragging = false;
            if (panelPosition) {
                localStorage.setItem('candidatesPanelPosition', JSON.stringify(panelPosition));
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [panelPosition]);

    const handleDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!panelRef.current) {
            return;
        }

        const panelRect = panelRef.current.getBoundingClientRect();
        dragStateRef.current = {
            dragging: true,
            offsetX: event.clientX - panelRect.left,
            offsetY: event.clientY - panelRect.top,
        };
    };

    const handleConfirmRemove = async () => {
        if (typeof tokenId !== 'number') {
            return;
        }

        await toggleToBeNormalized(tokenId);
        await refreshEssay();
        setShowRemoveConfirmation(false);
    };

    const assignForwardRef = (node: HTMLDivElement | null) => {
        panelRef.current = node;

        if (!forwardRef) {
            return;
        }

        if (typeof forwardRef === 'function') {
            forwardRef(node);
            return;
        }

        (forwardRef as MutableRefObject<HTMLDivElement | null>).current = node;
    };

    return (
        <div
            className={styles['candidates-panel']}
            ref={assignForwardRef}
            style={{
                top: panelPosition?.top ?? 150,
                left: panelPosition?.left ?? 'auto',
                right: panelPosition?.left == null ? 20 : 'auto',
            }}
        >
            <button className={styles['close-panel-button']} onClick={onClose} title="Fechar painel">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
                </svg>
            </button>
            <div className={styles['candidates-header']} onMouseDown={handleDragStart}>
                {hasCandidates && singleWordSelected ? 'Alternativas para ' : 'Substituir '}
                <span className={styles['selected-token']}>&quot;{selectedTokenText}&quot;</span>
            </div>

            <div className={styles['panel-footer']}>
                <div className={styles['new-candidate-container']}>
                    <input
                        ref={inputRef}
                        placeholder="Novo Token"
                        className={styles['new-candidate-input']}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onSelectCandidate(event.currentTarget.value);
                                event.currentTarget.blur();
                                event.currentTarget.value = '';
                            }
                        }}
                    />
                    <button
                        data-testid="edit-button"
                        className={`${styles['action-button']} ${styles['edit-button'] ?? ''}`}
                        title="Substituir Token"
                        onClick={() => {
                            const value = inputRef.current?.value ?? '';
                            onSelectCandidate(value);
                            if (inputRef.current) {
                                inputRef.current.value = '';
                            }
                        }}
                    >
                        &#128393;
                    </button>
                    <button
                        data-testid="delete-button"
                        className={`${styles['action-button']} ${styles['delete-button'] ?? ''}`}
                        title="Remover Substituição"
                        onClick={() => {
                            onSelectCandidate('');
                        }}
                    >
                        &#128465;
                    </button>
                    <button
                        data-testid="toggle-suggestion-button"
                        className={`${styles['action-button']} ${styles['remove-suggestions-button']} ${!toBeNormalized ? styles['active-green'] : ''}`}
                        title="Remover Marcação de Não Normalizado"
                        onClick={() => setShowRemoveConfirmation(true)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                        </svg>
                    </button>
                </div>

                <div className={styles['global-suggestion-container']}>
                    <label className={styles['global-suggestion-label']} data-testid="global-suggestion-label">
                        <input
                            type="checkbox"
                            checked={suggestForAll}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setSuggestForAll(event.target.checked)}
                        />
                        Sugestão Global
                    </label>
                    <div className={styles['info-tooltip-container']}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles['info-icon']}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <div className={styles['tooltip-text']}>
                            Ao marcar esta opção, o novo token será sugerida para todas as ocorrências deste token nos textos.
                        </div>
                    </div>
                </div>
            </div>

            {showRemoveConfirmation && (
                <div className={styles['confirmation-overlay']} data-testid="confirmation-overlay">
                    <div className={styles['confirmation-dialog']} data-testid="confirmation-dialog">
                        <p>Marcar token como (in)correto? Isso apenas removerá ou adicionará a marcação de &quot;Não Normalizado&quot;</p>
                        <div className={styles['confirmation-buttons']}>
                            <button
                                onClick={() => {
                                    void handleConfirmRemove();
                                }}
                                className={styles['confirm-btn']}
                            >
                                Confirmar
                            </button>
                            <button onClick={() => setShowRemoveConfirmation(false)} className={styles['cancel-btn']}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidatesSidePanel;