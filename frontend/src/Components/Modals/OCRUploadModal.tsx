import { type MouseEvent as ReactMouseEvent } from 'react';
import '../../styles/ocr_upload_modal.css';
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
        <div className="modal-overlay">
            <div className="modal-content upload-modal">
                <div className="modal-header">
                    <h2>Upload de Imagens para OCR</h2>
                    <button className="close-button" onClick={handleClose} disabled={isProcessing}>
                        &times;
                    </button>
                </div>

                <div className="modal-body">
                    {!isProcessing ? (
                        <>
                            <div
                                className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploadFile ? 'has-file' : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {!uploadFile ? (
                                    <>
                                        <svg className="upload-icon-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <div className="upload-text-container">
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
                                        </div>
                                    </>
                                ) : (
                                    <div className="file-info-container">
                                        <svg className="file-icon-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <div className="file-details">
                                            <span className="file-name">{uploadFile.name}</span>
                                            <span className="file-size">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                        <div className="file-status">
                                            {isValidating && <span className="validating">Validando...</span>}
                                            {!isValidating && isValidZip && <span className="valid-mark">✓ Válido</span>}
                                            {!isValidating && !isValidZip && hasError && <span className="invalid-mark">✗ Inválido</span>}
                                        </div>
                                        <button
                                            className="remove-file-btn"
                                            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                                                event.stopPropagation();
                                                clearFileSelection();
                                            }}
                                        >
                                            ✕ Remover
                                        </button>
                                    </div>
                                )}
                            </div>

                            {hasError && <div className="error-message">Erro durante upload, confira se o arquivo é válido.</div>}
                        </>
                    ) : (
                        <div className="processing-container">
                            <div className="progress-bar-container">
                                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="progress-text">{progress}%</p>
                            <p className="status-message">{statusMessage}</p>
                            <div className="processing-spinner"></div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={handleClose} disabled={isProcessing}>
                        Cancelar
                    </button>
                    {!isProcessing && (
                        <button
                            className={`confirm-button ${isValidZip && !isValidating ? 'enabled' : ''}`}
                            onClick={() => {
                                void handleUpload();
                            }}
                            disabled={!isValidZip || isValidating}
                        >
                            Fazer Upload
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OCRUploadModal;