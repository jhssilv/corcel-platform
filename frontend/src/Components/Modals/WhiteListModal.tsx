import { useEffect, useState, type ChangeEvent, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { parseTextFile } from '../../Services/Text/FileParsers';
import { addToWhitelist, getWhitelist, removeFromWhitelist } from '../../Api';
import { Dialog, DialogHeader, Stack } from '../Generic';
import { useSnackbar } from '../../Context/Generic';
import styles from '../../styles/whitelist_modal.module.css';

interface WhitelistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function WhitelistModal({ isOpen, onClose }: WhitelistModalProps) {
    const [whitelistText, setWhitelistText] = useState('');
    const [originalWhitelistText, setOriginalWhitelistText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { addSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchWhitelist = async () => {
            try {
                const whitelistedWords = await getWhitelist();
                const joined = whitelistedWords.tokens.join(', ');
                setWhitelistText(joined);
                setOriginalWhitelistText(joined);
            } catch (error) {
                console.error('Handle API fetch error:', error);
                addSnackbar({
                    text: 'Falha ao carregar a whitelist.',
                    type: 'error',
                });
            }
        };

        if (isOpen) {
            void fetchWhitelist();
        }
    }, [isOpen, addSnackbar]);

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            const originalWords = originalWhitelistText.split(',').map((word) => word.trim()).filter((word) => word.length > 0);
            const updatedWords = whitelistText.split(',').map((word) => word.trim()).filter((word) => word.length > 0);

            const wordsToAdd = updatedWords.filter((word) => !originalWords.includes(word));
            const wordsToRemove = originalWords.filter((word) => !updatedWords.includes(word));

            for (const word of wordsToAdd) {
                await addToWhitelist(word);
            }

            for (const word of wordsToRemove) {
                await removeFromWhitelist(word);
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
            setOriginalWhitelistText(whitelistText);
            addSnackbar({
                text: 'Whitelist atualizada com sucesso!',
                type: 'success',
            });
            onClose();
        } catch (error) {
            console.error('Error updating whitelist:', error);
            addSnackbar({
                text: 'Houve um erro ao atualizar a whitelist.',
                type: 'error',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancel = () => {
        setWhitelistText(originalWhitelistText);
        onClose();
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);

        const files = Array.from(event.dataTransfer.files);
        const textFiles = files.filter((file) => file.type === 'text/plain' || file.name.endsWith('.txt'));

        if (textFiles.length === 0) {
            return;
        }

        try {
            const allTokens: string[] = [];

            for (const file of textFiles) {
                const tokens = await parseTextFile(file);
                allTokens.push(...tokens);
            }

            if (allTokens.length > 0) {
                setWhitelistText((previous) => {
                    const separator = previous.trim() ? ', ' : '';
                    return previous + separator + allTokens.join(', ');
                });
            }
        } catch (error) {
            console.error('Error parsing files:', error);
            addSnackbar({
                text: 'Erro ao ler arquivos de texto.',
                type: 'error',
            });
        }
    };

    const hasTextChanged = whitelistText !== originalWhitelistText;

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog isOpen={isOpen} onClose={handleCancel} className={styles['whitelist-modal']}>
            <DialogHeader onClose={handleCancel}>Gerenciar Whitelist</DialogHeader>

            <Stack direction="vertical" gap={12} className={styles['modal-body']}>
                <label htmlFor="whitelist-textarea" className={styles['textarea-label']}>
                    Lista de palavras (separadas por vírgula):
                </label>
                <Stack direction="vertical" className={[styles['textarea-container'], isDragging ? styles.dragging : ''].filter(Boolean).join(' ')}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                        void handleDrop(event);
                    }}
                >
                    <textarea
                        id="whitelist-textarea"
                        className={styles['whitelist-textarea']}
                        value={whitelistText}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setWhitelistText(event.target.value)}
                        placeholder="Digite as palavras separadas por vírgula ou arraste arquivos de texto aqui..."
                        rows={15}
                    />
                    {isDragging && <Stack alignX="center" alignY="center" className={styles['drag-overlay']}>Solte os arquivos aqui</Stack>}
                </Stack>
            </Stack>

            <Stack alignX="end" gap={16} className={styles['modal-footer']}>
                <button className={[styles['modal-button'], styles['cancel-button']].join(' ')} onClick={handleCancel} disabled={isUpdating}>
                    Cancelar
                </button>
                <button
                    className={[styles['modal-button'], styles['update-button']].join(' ')}
                    onClick={() => {
                        void handleUpdate();
                    }}
                    disabled={!hasTextChanged || isUpdating}
                >
                    {isUpdating ? 'Atualizando...' : 'Atualizar'}
                </button>
            </Stack>
        </Dialog>
    );
}

export default WhitelistModal;