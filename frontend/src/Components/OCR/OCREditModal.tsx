import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent } from 'react';
import '../../styles/ocr_modal.css';
import { finalizeRawText, getRawTextImage, updateRawText } from '../../Api';
import { useSnackbar } from '../../Context/Generic';
import { Dialog, DialogHeader } from '../Generic';
import type { RawTextDetail } from '../../types';

interface OCREditModalProps {
    rawText: (RawTextDetail & { source_file_name: string }) | null;
    onClose: () => void;
    onToggleImage?: () => void;
    onFinish?: () => void;
}

type ProcessingState = 'processing' | 'success' | 'error' | null;

interface Point {
    x: number;
    y: number;
}

const OCREditModal = ({ rawText, onClose, onToggleImage, onFinish }: OCREditModalProps) => {
    const { addSnackbar } = useSnackbar();
    const [textContent, setTextContent] = useState('');
    const [imageHidden, setImageHidden] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(100);
    const [imagePosition, setImagePosition] = useState<Point>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [processingState, setProcessingState] = useState<ProcessingState>(null);
    const [processingMessage, setProcessingMessage] = useState('');
    const [finalFileName, setFinalFileName] = useState('');
    const imageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        let createdUrl: string | null = null;

        const loadImage = async () => {
            if (!rawText?.id) {
                return;
            }

            try {
                const url = await getRawTextImage(rawText.id);
                createdUrl = url;
                setImageUrl(url);
            } catch (error) {
                console.error('Failed to load image:', error);
            }
        };

        if (rawText) {
            setTextContent(rawText.text_content || '');
            setFinalFileName(rawText.source_file_name || '');
            setZoomLevel(100);
            setImagePosition({ x: 0, y: 0 });
            void loadImage();
        }

        return () => {
            if (createdUrl) {
                URL.revokeObjectURL(createdUrl);
            }
        };
    }, [rawText]);

    const handleZoomIn = () => {
        setZoomLevel((previous) => Math.min(previous + 10, 200));
    };

    const handleZoomOut = () => {
        setZoomLevel((previous) => Math.max(previous - 10, 50));
    };

    const handleResetZoom = () => {
        setZoomLevel(100);
        setImagePosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return;
        }

        setIsDragging(true);
        setDragStart({
            x: event.clientX - imagePosition.x,
            y: event.clientY - imagePosition.y,
        });
    };

    const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!isDragging) {
            return;
        }

        setImagePosition({
            x: event.clientX - dragStart.x,
            y: event.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -5 : 5;
        setZoomLevel((previous) => Math.max(50, Math.min(200, previous + delta)));
    };

    const handleToggleImage = () => {
        setImageHidden(!imageHidden);
        onToggleImage?.();
    };

    const handleFinish = async () => {
        if (!rawText) {
            return;
        }

        setIsSaving(true);
        try {
            await updateRawText(rawText.id, textContent);
            addSnackbar({ text: 'Texto salvo com sucesso!', type: 'success' });
            onFinish?.();
            onClose();
        } catch (error) {
            console.error('Error saving text:', error);
            addSnackbar({ text: 'Erro ao salvar texto.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmFinalize = async () => {
        if (!rawText) {
            return;
        }

        setIsFinalizing(true);
        setProcessingState('processing');
        setProcessingMessage('Processando texto, aguarde...');

        try {
            await updateRawText(rawText.id, textContent);
            await finalizeRawText(rawText.id, finalFileName);

            addSnackbar({ text: 'Texto finalizado com sucesso!', type: 'success' });
            onFinish?.();
            onClose();
        } catch (error) {
            console.error('Error finalizing text:', error);
            handleCloseProcessing();
            addSnackbar({ text: 'Erro ao finalizar o texto.', type: 'error' });
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleCancelFinalize = () => {
        setShowConfirmModal(false);
    };

    const handleCloseProcessing = () => {
        setShowConfirmModal(false);
        setProcessingState(null);
        setProcessingMessage('');
    };

    const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setTextContent(event.target.value);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Tab') {
            return;
        }

        event.preventDefault();

        const { selectionStart, selectionEnd } = event.currentTarget;
        const newValue = `${textContent.substring(0, selectionStart)}\t${textContent.substring(selectionEnd)}`;
        setTextContent(newValue);

        setTimeout(() => {
            event.currentTarget.selectionStart = selectionStart + 1;
            event.currentTarget.selectionEnd = selectionStart + 1;
        }, 0);
    };

    if (!rawText) {
        return null;
    }

    return (
        <>
            <Dialog isOpen={!!rawText} onClose={onClose} className="ocr-modal-content">
                <DialogHeader onClose={onClose}>
                    {rawText.source_file_name}
                </DialogHeader>

                <div className="ocr-modal-body">
                    {!imageHidden && (
                        <div className="ocr-modal-image-panel">
                            <div className="ocr-image-controls">
                                <button className="ocr-control-btn" onClick={handleZoomOut}>-</button>
                                <span className="ocr-control-hint">{zoomLevel}%</span>
                                <button className="ocr-control-btn" onClick={handleZoomIn}>+</button>
                                <button className="ocr-control-btn" onClick={handleResetZoom}>Reset</button>
                            </div>

                            <div
                                className="ocr-image-container"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onWheel={handleWheel}
                            >
                                {imageUrl ? (
                                    <img
                                        ref={imageRef}
                                        src={imageUrl}
                                        alt="OCR Source"
                                        className="ocr-modal-image"
                                        draggable={false}
                                        style={{
                                            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoomLevel / 100})`,
                                        }}
                                    />
                                ) : (
                                    <div className="ocr-image-placeholder">Loading image...</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="ocr-modal-text-panel" style={imageHidden ? { gridColumn: '1 / -1' } : {}}>
                        <div className="ocr-text-toolbar">
                            <h3 className="ocr-toolbar-title">Texto Transcrito</h3>
                            <div className="ocr-toolbar-actions">
                                <button className="ocr-action-btn ocr-btn-secondary" onClick={handleToggleImage}>
                                    {imageHidden ? 'Mostrar Imagem' : 'Ocultar Imagem'}
                                </button>
                                <button
                                    className="ocr-action-btn ocr-btn-primary"
                                    onClick={() => {
                                        void handleFinish();
                                    }}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar e Fechar'}
                                </button>
                                <button
                                    className="ocr-action-btn ocr-btn-success"
                                    onClick={handleFinalize}
                                    disabled={isSaving || isFinalizing}
                                >
                                    {isFinalizing ? 'Finalizando...' : 'Finalizar'}
                                </button>
                            </div>
                        </div>

                        <textarea
                            className="ocr-modal-textarea"
                            value={textContent}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite o texto transcrito aqui..."
                            spellCheck={false}
                        />
                    </div>
                </div>
            </Dialog>

            {showConfirmModal && (
                <Dialog
                    isOpen={showConfirmModal}
                    onClose={processingState ? () => { } : handleCancelFinalize}
                    className="ocr-confirm-modal"
                >
                    {!processingState && (
                        <>
                            <h3>Confirmar Finalização</h3>
                            <p>
                                Tem certeza que deseja finalizar este texto?
                                <br />
                                O texto será processado e ficará disponível para normalização.
                                <br />
                                <strong>A versão bruta e a imagem associada serão excluídas.</strong>
                            </p>
                            <div className="ocr-confirm-filename-group">
                                <label htmlFor="finalFileName">Nome do arquivo final:</label>
                                <input
                                    id="finalFileName"
                                    type="text"
                                    value={finalFileName}
                                    onChange={(event) => setFinalFileName(event.target.value)}
                                    placeholder="Nome do arquivo"
                                    disabled={isFinalizing}
                                />
                            </div>
                            <div className="ocr-confirm-modal-actions">
                                <button
                                    className="ocr-action-btn ocr-btn-secondary"
                                    onClick={handleCancelFinalize}
                                    disabled={isFinalizing}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="ocr-action-btn ocr-btn-danger"
                                    onClick={() => {
                                        void handleConfirmFinalize();
                                    }}
                                    disabled={isFinalizing}
                                >
                                    {isFinalizing ? 'Finalizando...' : 'Confirmar'}
                                </button>
                            </div>
                        </>
                    )}

                    {processingState === 'processing' && (
                        <>
                            <h3>Processando</h3>
                            <div className="ocr-loading-container">
                                <div className="ocr-loading-spinner"></div>
                            </div>
                            <p className="ocr-processing-text">{processingMessage}</p>
                        </>
                    )}
                </Dialog>
            )}
        </>
    );
};

export default OCREditModal;