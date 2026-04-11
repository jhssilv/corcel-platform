import { type MouseEvent as ReactMouseEvent } from 'react';
import '../../styles/ocr_upload_modal.css';
import { Icon } from '../Generic';
import { UseOCRUploadTask } from '../../Hooks/Upload/UseOCRUploadTask';

interface OCRUploadSectionProps {
    onUploadComplete?: () => void;
}

function OCRUploadSection({ onUploadComplete }: OCRUploadSectionProps) {
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
        handleFileSelect,
        handleUpload,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    } = UseOCRUploadTask({
        onUploadComplete,
        resetOnSuccess: true,
    });

    return (
        <div className="ocr-upload-section">
            <h3 className="ocr-upload-title">Upload de Imagens para OCR</h3>
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
                                <Icon name="Upload" color="black" className="upload-icon-svg" style={{ color: 'currentColor' }} />
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
                                <Icon name="FileText" color="black" className="file-icon-svg" style={{ color: 'currentColor' }} />
                                <div className="file-details">
                                    <span className="file-name">{uploadFile.name}</span>
                                    <span className="file-size">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                                <div className="file-status">
                                    {isValidating && <span className="validating">Validando...</span>}
                                    {!isValidating && isValidZip && <span className="valid-mark">Válido</span>}
                                    {!isValidating && !isValidZip && hasError && <span className="invalid-mark">Inválido</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                    <button
                                        className="remove-file-btn"
                                        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                                            event.stopPropagation();
                                            clearFileSelection();
                                        }}
                                    >
                                        Remover
                                    </button>
                                    <button
                                        className={`confirm-button ${isValidZip && !isValidating ? 'enabled' : ''}`}
                                        onClick={() => {
                                            void handleUpload();
                                        }}
                                        disabled={!isValidZip || isValidating}
                                    >
                                        Fazer Upload
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
    );
}

export default OCRUploadSection;