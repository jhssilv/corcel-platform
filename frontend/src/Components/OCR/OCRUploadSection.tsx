import { Card, CardTitle, ProgressInline } from '../Generic';
import { UseOCRUploadTask } from '../../Hooks/Upload/UseOCRUploadTask';
import OCRZipUploadContent from './OCRZipUploadContent';
import styles from './ocr_upload_section.module.css';

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
        <Card className={styles.uploadSection}>
            <CardTitle>
                Upload de Imagens para OCR
            </CardTitle>
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
                    showUploadButton
                    onUpload={() => {
                        void handleUpload();
                    }}
                />
            ) : (
                <ProgressInline
                    progress={progress}
                    statusMessage={statusMessage}
                    showPercent
                    showSpinner
                />
            )}
        </Card>
    );
}

export default OCRUploadSection;