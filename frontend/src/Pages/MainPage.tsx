import { useCallback, useEffect, useState } from 'react';
import EssayDisplay from '../Components/Text/EssayDisplay';
import EssaySelector from '../Components/Text/EssaySelector';
import TopBar from '../Components/Layout/TopBar';
import DownloadDialog from '../Components/Modals/DownloadDialog';
import downloadTexts from '../Api/DownloadTexts';
import { getNormalizationsByText, getTextById } from '../Api';
import { useToast } from '../Context/Generic';
import type { Option, TextDetailResponse } from '../types';
import '../styles/main_page.css';

function MainPage() {
    const [selectedEssay, setSelectedEssay] = useState<Option<number> | null>(null);
    const [currentText, setCurrentText] = useState<TextDetailResponse | null>(null);
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { addToast } = useToast();

    const fetchEssay = useCallback(async () => {
        if (!selectedEssay) {
            return;
        }

        try {
            const text = await getTextById(selectedEssay.value);
            const normalizations = await getNormalizationsByText(selectedEssay.value);
            setCurrentText({ ...text, corrections: normalizations });
        } catch (err) {
            console.error('Failed to fetch essay details:', err);
            addToast({
                text: 'Erro ao carregar detalhes do texto.',
                type: 'error',
                duration: 5000,
            });
        }
    }, [selectedEssay, addToast]);

    const handleEssayUpdate = async () => {
        await fetchEssay();
        setRefreshTrigger((prev) => prev + 1);
    };

    useEffect(() => {
        if (selectedEssay) {
            void fetchEssay();
        }
    }, [selectedEssay, fetchEssay]);

    return (
        <section className="main-page-section">
            <TopBar onDownloadClick={() => setShowDownloadDialog(true)} />

            <h2 className="main-page-header">Busca de Textos</h2>

            <div>
                <EssaySelector
                    selectedEssay={selectedEssay}
                    setSelectedEssay={setSelectedEssay}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            <EssayDisplay essay={currentText} refreshEssay={handleEssayUpdate} />

            <DownloadDialog
                show={showDownloadDialog}
                onClose={() => setShowDownloadDialog(false)}
                onDownload={(useBrackets: boolean) => downloadTexts(useBrackets)}
            />
        </section>
    );
}

export default MainPage;
