import { useEffect, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { deleteNormalization, postNormalization } from '../../Api';
import { Stack, Button, DialogFooter } from '../Generic';
import styles from './new_correction_popup.module.css';
import type { TextDetailResponse } from '../../types';

interface TokenPosition {
    top: number;
    left: number;
    height: number;
    width: number;
}

interface EssayToken {
    text: string;
}

interface NewCorrectionPopupProps {
    essay: TextDetailResponse;
    candidate?: string;
    isActive: boolean;
    selectedFirstIndex: number | null;
    selectedLastIndex: number | null;
    setSelectedCandidate: (candidate: string | null) => void;
    setPopupIsActive: (active: boolean) => void;
    refreshEssay: () => Promise<void> | void;
    clearSelection?: () => void;
    suggestForAll?: boolean;
    tokenPosition: TokenPosition | null;
}

const NewCorrectionPopup = ({
    essay,
    candidate = '',
    isActive,
    setPopupIsActive,
    selectedFirstIndex,
    selectedLastIndex,
    setSelectedCandidate,
    refreshEssay,
    suggestForAll = false,
    tokenPosition,
}: NewCorrectionPopupProps) => {
    const [username, setUsername] = useState<string | null>(null);
    const tokens = (essay.tokens ?? []) as unknown as EssayToken[];
    const tokenText = selectedFirstIndex !== null ? (tokens[selectedFirstIndex]?.text ?? '') : '';

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        setUsername(storedUsername);
    }, []);

    const handleCloseButton = () => {
        setSelectedCandidate(null);
        setPopupIsActive(false);
    };

    const handleAddButton = async (event?: ReactMouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => {
        event?.preventDefault();

        if (selectedFirstIndex === null) {
            return;
        }

        const endIndex = selectedLastIndex ?? selectedFirstIndex;

        if (!candidate) {
            await deleteNormalization(essay.id, selectedFirstIndex);
        } else {
            await postNormalization(essay.id, selectedFirstIndex, endIndex, candidate, suggestForAll);
        }

        await refreshEssay();
        setSelectedCandidate(null);
        setPopupIsActive(false);
    };

    if (!isActive || selectedFirstIndex === null) {
        return null;
    }

    let dialogStyle: CSSProperties = {};
    if (tokenPosition) {
        const viewportTop = tokenPosition.top - window.scrollY;
        const viewportLeft = tokenPosition.left - window.scrollX;
        const isBottomHalf = viewportTop > window.innerHeight / 2;

        dialogStyle = {
            position: 'fixed',
            left: viewportLeft,
            transform: 'none',
            margin: 0,
            zIndex: 1001,
        };

        if (isBottomHalf) {
            dialogStyle.bottom = window.innerHeight - viewportTop + 10;
            dialogStyle.top = 'auto';
        } else {
            dialogStyle.top = viewportTop + 40;
            dialogStyle.bottom = 'auto';
        }
    }

    if (!candidate) {
        return (
            <Stack alignX="center" alignY="center" className={styles.overlay} onClick={handleCloseButton}>
                <div className={styles.dialog} style={dialogStyle} data-testid="confirmation-dialog">
                    <p className={styles.dialogText}>{username ? <><strong>{username}</strong>, </> : ''}você deseja remover a correção?</p>
                    <DialogFooter align="center">
                        <Button
                            tier="primary"
                            variant="danger"
                            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                                void handleAddButton(event);
                            }}
                            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                                if (event.key === 'Enter') {
                                    void handleAddButton(event);
                                }
                            }}
                            tabIndex={0}
                            autoFocus
                        >
                            Remover
                        </Button>
                        <Button tier="secondary" variant="neutral" onClick={handleCloseButton}>Cancelar</Button>
                    </DialogFooter>
                </div>
            </Stack>
        );
    }

    return (
        <Stack alignX="center" alignY="center" className={styles.overlay} onClick={handleCloseButton}>
            <div className={styles.dialog} style={dialogStyle} data-testid="confirmation-dialog">
                <p className={styles.dialogText}>
                    {username ? <><strong>{username}</strong>, </> : ''}
                    você deseja adicionar <i>{candidate}</i> como correção
                    {suggestForAll ? ` para todas as ocorrências de "${tokenText}"? Isso afetará todos os textos` : '?'}
                </p>
                <DialogFooter align="center">
                    <Button
                        tier="primary"
                        variant="action"
                        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                            void handleAddButton(event);
                        }}
                        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                            if (event.key === 'Enter') {
                                void handleAddButton(event);
                            }
                        }}
                        tabIndex={0}
                        autoFocus
                    >
                        Adicionar
                    </Button>
                    <Button tier="secondary" variant="neutral" onClick={handleCloseButton}>Cancelar</Button>
                </DialogFooter>
            </div>
        </Stack>
    );
};

export default NewCorrectionPopup;