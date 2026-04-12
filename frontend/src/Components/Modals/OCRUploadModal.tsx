import { Dialog, DialogHeader, Button, DialogFooter, ProgressInline } from '../Generic';
import { UseOCRUploadTask } from '../../Hooks/Upload/UseOCRUploadTask';
import OCRZipUploadContent from '../OCR/OCRZipUploadContent';

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

            <div style={{ padding: '1.5rem' }}>
                {!isProcessing ? (
                    <OCRZipUploadContent
                        uploadFile={uploadFile}
                        hasError={hasError}
                        isValidZip={isValidZip}
                        isDragging={isDragging}
                        isValidating={isValidating}
                        onFileSelect={handleFileSelect}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClear={clearFileSelection}
                    />
                ) : (
                    <ProgressInline
                        progress={progress}
                        statusMessage={statusMessage}
                        showPercent
                        showSpinner
                    />
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