import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { finalizeRawText, getRawTextImage, updateRawText } from '../../Api';
import { useSnackbar } from '../../Context/Generic';
import { Banner, Button, Dialog, DialogFooter, DialogHeader, FormField, Stack } from '../Generic';
import type { RawTextDetail } from '../../types';
import styles from './ocr_edit_modal.module.css';

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
            <Dialog isOpen={!!rawText} onClose={onClose} className={styles.modalContent}>
                <DialogHeader onClose={onClose}>
                    {rawText.source_file_name}
                </DialogHeader>

                <div className={styles.modalBody}>
                    {!imageHidden && (
                        <div className={styles.modalImagePanel}>
                            <div className={styles.imageControls}>
                                <Button type="button" tier="secondary" variant="neutral" size="sm" onClick={handleZoomOut}>-</Button>
                                <span className={styles.controlHint}>{zoomLevel}%</span>
                                <Button type="button" tier="secondary" variant="neutral" size="sm" onClick={handleZoomIn}>+</Button>
                                <Button type="button" tier="secondary" variant="neutral" size="sm" onClick={handleResetZoom}>Reset</Button>
                            </div>

                            <div
                                className={styles.imageContainer}
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
                                        className={styles.modalImage}
                                        draggable={false}
                                        style={{
                                            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoomLevel / 100})`,
                                        }}
                                    />
                                ) : (
                                    <div className={styles.imagePlaceholder}>Loading image...</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={[styles.modalTextPanel, imageHidden ? styles.modalTextPanelExpanded : ''].filter(Boolean).join(' ')}>
                        <div className={styles.textToolbar}>
                            <h3 className={styles.toolbarTitle}>Texto Transcrito</h3>
                            <div className={styles.toolbarActions}>
                                <Button type="button" tier="secondary" variant="neutral" onClick={handleToggleImage}>
                                    {imageHidden ? 'Mostrar Imagem' : 'Ocultar Imagem'}
                                </Button>
                                <Button
                                    type="button"
                                    tier="primary"
                                    variant="action"
                                    onClick={() => {
                                        void handleFinish();
                                    }}
                                    disabled={isSaving}
                                    isLoading={isSaving}
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar e Fechar'}
                                </Button>
                                <Button
                                    type="button"
                                    tier="primary"
                                    variant="action"
                                    onClick={handleFinalize}
                                    disabled={isSaving || isFinalizing}
                                    isLoading={isFinalizing}
                                >
                                    {isFinalizing ? 'Finalizando...' : 'Finalizar'}
                                </Button>
                            </div>
                        </div>

                        <textarea
                            className={styles.modalTextarea}
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
                    className={styles.confirmModal}
                >
                    {!processingState && (
                        <>
                            <DialogHeader>Confirmar Finalização</DialogHeader>
                            <Stack direction="vertical" gap={14} className={styles.confirmContent}>
                                <p>
                                    Tem certeza que deseja finalizar este texto?
                                    <br />
                                    O texto será processado e ficará disponível para normalização.
                                </p>
                                <Banner variant="danger">
                                    A versão bruta e a imagem associada serão excluídas.
                                </Banner>
                                <FormField label="Nome do arquivo final:" htmlFor="finalFileName">
                                    <input
                                        id="finalFileName"
                                        type="text"
                                        value={finalFileName}
                                        onChange={(event) => setFinalFileName(event.target.value)}
                                        placeholder="Nome do arquivo"
                                        disabled={isFinalizing}
                                    />
                                </FormField>
                            </Stack>
                            <DialogFooter align="right">
                                <Button
                                    type="button"
                                    tier="secondary"
                                    variant="neutral"
                                    onClick={handleCancelFinalize}
                                    disabled={isFinalizing}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    tier="primary"
                                    variant="danger"
                                    onClick={() => {
                                        void handleConfirmFinalize();
                                    }}
                                    disabled={isFinalizing}
                                    isLoading={isFinalizing}
                                >
                                    {isFinalizing ? 'Finalizando...' : 'Confirmar'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {processingState === 'processing' && (
                        <>
                            <DialogHeader>Processando</DialogHeader>
                            <Stack direction="vertical" alignX="center" gap={16} className={styles.processingContent}>
                                <div className={styles.loadingSpinner}></div>
                                <Banner variant="info">{processingMessage}</Banner>
                            </Stack>
                        </>
                    )}
                </Dialog>
            )}
        </>
    );
};

export default OCREditModal;