import { useState, useEffect, useCallback, useContext } from 'react';
import '../styles/main_page.css';

import EssaySelector from './essay_selector.jsx';
import EssayDisplay from './essay_display.jsx';
import AuthContext from './auth_context.jsx';
import DownloadDialog from './download_dialog.jsx';
import DownloadButton from './download_button.jsx';

import downloadTexts from './api/download_texts.jsx';
import { getTextById, getNormalizationsByText } from './api/api_functions.jsx';

// MAIN PAGE COMPONENT \\

function MainPage() {
    const [selectedEssay, setSelectedEssay] = useState(null);
    const [currentText, setCurrentText] = useState(null);
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);

    const { userId } = useContext(AuthContext);

    const fetchEssay = useCallback(async () => {
        const text = await getTextById(selectedEssay.value, userId);
        const normalizations = await getNormalizationsByText(selectedEssay.value, userId);
        
        text.corrections = normalizations;
        setCurrentText(text);
    }, [selectedEssay, userId]);

    useEffect(() => {
        if (selectedEssay) fetchEssay();
    }, [selectedEssay, fetchEssay]);


    return (
        <section>
            <h1>CorCel 🐴</h1>
            <h2>Plataforma de Normalização Ortográfica</h2>

            <div> 
                <DownloadButton onClick={() => setShowDownloadDialog(true)}>Baixar Textos
                    <span role="img" aria-label="download">⬇️</span>
                </DownloadButton>
                <EssaySelector 
                    selectedEssay={selectedEssay}
                    setSelectedEssay={setSelectedEssay}
                />
            </div>

            <EssayDisplay 
                essay={currentText}
                refreshEssay={fetchEssay}
            />

            <DownloadDialog
                show={showDownloadDialog}
                onClose={() => setShowDownloadDialog(false)}
                onDownload={(useBrackets) => downloadTexts(useBrackets)}
            />
        </section>
    );
}

export default MainPage;
