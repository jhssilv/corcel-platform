import { useEffect, useState, type ChangeEvent } from 'react';
import { parseTextFile } from '../../Services/Text/FileParsers';
import { addToWhitelist, getWhitelist, removeFromWhitelist } from '../../Api';
import { Dialog, DialogHeader, Stack, Button, DialogFooter, FormField, DropZone } from '../Generic';
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

    const handleDropFiles = async (files: File[]) => {
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
                <FormField label="Lista de palavras (separadas por vírgula):" htmlFor="whitelist-textarea">
                    <DropZone
                        className={styles['textarea-container']}
                        draggingClassName={styles.dragging}
                        enableClickSelect={false}
                        onFilesDropped={(files) => {
                            void handleDropFiles(files);
                        }}
                    >
                        {({ isDragging }) => {
                            return (
                                <Stack direction="vertical">
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
                            );
                        }}
                    </DropZone>
                </FormField>
            </Stack>

            <DialogFooter>
                <Button tier="secondary" variant="neutral" onClick={handleCancel} disabled={isUpdating}>
                    Cancelar
                </Button>
                <Button
                    tier="primary"
                    variant="action"
                    onClick={() => {
                        void handleUpdate();
                    }}
                    disabled={!hasTextChanged || isUpdating}
                    isLoading={isUpdating}
                >
                    Atualizar
                </Button>
            </DialogFooter>
        </Dialog>
    );
}

export default WhitelistModal;