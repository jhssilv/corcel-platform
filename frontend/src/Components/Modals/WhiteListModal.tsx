import { useEffect, useState, type ChangeEvent, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { parseTextFile } from '../../Services/Text/FileParsers';
import { addToWhitelist, getWhitelist, removeFromWhitelist } from '../../Api';

interface WhitelistModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function WhitelistModal({ isOpen, onClose }: WhitelistModalProps) {
    const [whitelistText, setWhitelistText] = useState('');
    const [originalWhitelistText, setOriginalWhitelistText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const fetchWhitelist = async () => {
            try {
                const whitelistedWords = await getWhitelist();
                const joined = whitelistedWords.tokens.join(', ');
                setWhitelistText(joined);
                setOriginalWhitelistText(joined);
            } catch (error) {
                console.error('[TODO] Handle API fetch error:', error);
            }
        };

        if (isOpen) {
            void fetchWhitelist();
        }
    }, [isOpen]);

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
            onClose();
        } catch (error) {
            console.error('Error updating whitelist:', error);
            alert('Houve um erro ao atualizar a whitelist.');
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
            alert('Erro ao ler arquivos de texto.');
        }
    };

    const hasTextChanged = whitelistText !== originalWhitelistText;

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={handleCancel}>
            <div className="whitelist-modal" onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Gerenciar Whitelist</h2>
                    <button className="modal-close-button" onClick={handleCancel} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <label htmlFor="whitelist-textarea" className="textarea-label">
                        Lista de palavras (separadas por vírgula):
                    </label>
                    <div
                        className={`textarea-container ${isDragging ? 'dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(event) => {
                            void handleDrop(event);
                        }}
                    >
                        <textarea
                            id="whitelist-textarea"
                            className="whitelist-textarea"
                            value={whitelistText}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setWhitelistText(event.target.value)}
                            placeholder="Digite as palavras separadas por vírgula ou arraste arquivos de texto aqui..."
                            rows={15}
                        />
                        {isDragging && <div className="drag-overlay">Solte os arquivos aqui</div>}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="modal-button cancel-button" onClick={handleCancel} disabled={isUpdating}>
                        Cancelar
                    </button>
                    <button
                        className="modal-button update-button"
                        onClick={() => {
                            void handleUpdate();
                        }}
                        disabled={!hasTextChanged || isUpdating}
                    >
                        {isUpdating ? 'Atualizando...' : 'Atualizar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WhitelistModal;