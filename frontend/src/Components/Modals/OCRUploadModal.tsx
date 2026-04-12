import { type MouseEvent as ReactMouseEvent } from 'react';
import '../../styles/ocr_upload_modal.css';
import { Icon, Dialog, DialogHeader, Stack, Button, DialogFooter } from '../Generic';
import { UseOCRUploadTask } from '../../Hooks/Upload/UseOCRUploadTask';

interface OCRUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete?: () => void;
}

function OCRUploadModal({ isOpen, onClose, onUploadComplete }: OCRUploadModalProps) {
    const {
        uploadFile,
        hasError,
        isValidZip,
        isDragging,
        isValidating,
        isProcessing,
        progress,
        statusMessage,
        clearFileSelection,
        resetState,
        handleFileSelect,
        handleUpload,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    } = UseOCRUploadTask({
        onUploadComplete,
        onSuccess: onClose,
    });

    const handleClose = () => {
        if (!isProcessing) {
            resetState();
        }

        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} className="modal-content upload-modal ocr">
            <DialogHeader onClose={handleClose}>
                Upload de Imagens para OCR
            </DialogHeader>

            <div className="modal-body">
                {!isProcessing ? (
                    <>
                        <Stack
                            direction="vertical"
                            alignX="center"
                            alignY="center"
                            gap={16}
                            className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploadFile ? 'has-file' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {!uploadFile ? (
                                <>
                                    <Icon name="Upload" color="black" className="upload-icon-svg" style={{ color: 'currentColor' }} />
                                    <Stack direction="vertical" alignX="center" gap={12} className="upload-text-container">
                                        <p className="upload-main-text">
                                            {isDragging ? 'Solte o arquivo aqui' : 'Arraste e solte seu arquivo ZIP aqui'}
                                        </p>
                                        <p className="upload-or-text">ou</p>
                                        <label className="file-input-label">
                                            <span className="file-input-button">Escolher arquivo</span>
                                            <input
                                                type="file"
                                                accept=".zip"
                                                onChange={handleFileSelect}
                                                className="file-input"
                                            />
                                        </label>
                                        <p className="upload-hint-text">Apenas arquivos .zip contendo imagens (PNG, JPG, TIF)</p>
                                    </Stack>
                                </>
                            ) : (
                                <Stack direction="vertical" alignX="center" gap={16} className="file-info-container">
                                    <Icon name="FileText" color="black" className="file-icon-svg" style={{ color: 'currentColor' }} />
                                    <Stack direction="vertical" alignX="center" gap={4} className="file-details">
                                        <span className="file-name">{uploadFile.name}</span>
                                        <span className="file-size">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </Stack>
                                    <div className="file-status">
                                        {isValidating && <span className="validating">Validando...</span>}
                                        {!isValidating && isValidZip && <span className="valid-mark">Válido</span>}
                                        {!isValidating && !isValidZip && hasError && <span className="invalid-mark">Inválido</span>}
                                    </div>
                                    <button
                                        className="remove-file-btn"
                                        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                                            event.stopPropagation();
                                            clearFileSelection();
                                        }}
                                    >
                                        Remover
                                    </button>
                                </Stack>
                            )}
                        </Stack>

                        {hasError && <div className="error-message">Erro durante upload, confira se o arquivo é válido.</div>}
                    </>
                ) : (
                    <Stack direction="vertical" alignX="center" gap={20} className="processing-container">
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="progress-text">{progress}%</p>
                        <p className="status-message">{statusMessage}</p>
                        <div className="processing-spinner"></div>
                    </Stack>
                )}
            </div>

            <DialogFooter>
                <Button tier="secondary" variant="neutral" onClick={handleClose} disabled={isProcessing}>
                    Cancelar
                </Button>
                {!isProcessing && (
                    <Button
                        tier="primary"
                        variant="action"
                        onClick={() => {
                            void handleUpload();
                        }}
                        disabled={!isValidZip || isValidating}
                    >
                        Fazer Upload
                    </Button>
                )}
            </DialogFooter>
        </Dialog>
    );
}

export default OCRUploadModal;