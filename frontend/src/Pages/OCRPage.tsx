import { useCallback, useEffect, useState } from 'react';
import EssaySelector from '../Components/Text/EssaySelector';
import OCREditModal from '../Components/OCR/OCREditModal';
import OCRUploadSection from '../Components/OCR/OCRUploadSection';
import { Icon, Stack } from '../Components/Generic';
import TopBar from '../Components/Layout/TopBar';
import { getRawTextById } from '../Api';
import { useToast } from '../Context/Generic';
import type { Option, RawTextDetail } from '../types';
import '../styles/main_page.css';
import '../styles/ocr_toolbar.css';

type OCREditableRawText = RawTextDetail & { source_file_name: string };

function OCRPage() {
    const [selectedEssay, setSelectedEssay] = useState<Option<number> | null>(null);
    const [currentText, setCurrentText] = useState<OCREditableRawText | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { addToast } = useToast();

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
        } catch (err) {
            console.error('Failed to fetch raw text', err);
            addToast({
                text: 'Erro ao carregar texto OCR.',
                type: 'error',
                duration: 5000
            });
        }
    }, [selectedEssay, addToast]);

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
                <Stack alignX="space-between" alignY="center" style={{ marginBottom: '15px' }}>
                    <Stack alignY="center" gap={16}>
                        <button
                            className="ocr-back-button"
                            onClick={() => {
                                window.location.href = '/main';
                            }}
                        >
                            <Icon name="ArrowLeft" color="black" size={16} style={{ color: 'currentColor' }} />
                            Voltar
                        </button>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Buscar Textos Transcritos Com OCR</h2>
                    </Stack>
                </Stack>

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
