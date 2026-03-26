import { useCallback, useEffect, useState } from 'react';
import EssaySelector from '../Components/Text/EssaySelector';
import OCREditModal from '../Components/OCR/OCREditModal';
import OCRUploadSection from '../Components/OCR/OCRUploadSection';
import TopBar from '../Components/Layout/TopBar';
import { getRawTextById } from '../Api';
import type { Option, RawTextDetail } from '../types';
import '../styles/main_page.css';
import '../styles/ocr_toolbar.css';

type OCREditableRawText = RawTextDetail & { source_file_name: string };

function OCRPage() {
    const [selectedEssay, setSelectedEssay] = useState<Option<number> | null>(null);
    const [currentText, setCurrentText] = useState<OCREditableRawText | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchEssay = useCallback(async () => {
        if (!selectedEssay) {
            return;
        }

        try {
            const rawText = await getRawTextById(selectedEssay.value);
            setCurrentText({
                ...rawText,
                source_file_name: rawText.source_file_name ?? '',
            });
            setIsEditModalOpen(true);
        } catch (error) {
            console.error('Failed to fetch raw text', error);
        }
    }, [selectedEssay]);

    useEffect(() => {
        if (selectedEssay) {
            void fetchEssay();
        }
    }, [selectedEssay, fetchEssay]);

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setCurrentText(null);
        setSelectedEssay(null);
    };

    const handleFinishOCR = () => {
        handleCloseEditModal();
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleUploadComplete = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    return (
        <section className="ocr-page-section">
            <TopBar showSidePanel={true} />

            <div className="ocr-controls-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button
                            className="ocr-back-button"
                            onClick={() => {
                                window.location.href = '/main';
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Voltar
                        </button>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Buscar Textos Transcritos Com OCR</h2>
                    </div>
                </div>

                <EssaySelector
                    selectedEssay={selectedEssay}
                    setSelectedEssay={setSelectedEssay}
                    refreshTrigger={refreshTrigger}
                    onlyRaw={true}
                />
            </div>

            <OCRUploadSection onUploadComplete={handleUploadComplete} />

            {isEditModalOpen && currentText && (
                <OCREditModal
                    rawText={currentText}
                    onClose={handleCloseEditModal}
                    onFinish={handleFinishOCR}
                />
            )}
        </section>
    );
}

export default OCRPage;
