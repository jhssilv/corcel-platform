import { useState, useEffect, useCallback, useContext } from 'react';
import '../styles/main_page.css';
import EssaySelector from './essay_selector.jsx';
import EssayDisplay from './essay_display.jsx';
import AuthContext from './auth_context.jsx';

import { getTextById, getNormalizationsByText } from './api/api_functions.jsx';

// MAIN PAGE COMPONENT \\

function MainPage() {
    const [selectedEssay, setSelectedEssay] = useState(null);
    const [currentText, setCurrentText] = useState(null);

    const userId = useContext(AuthContext).userId;

    const fetchEssay = useCallback(async () => {
        const text = await getTextById(selectedEssay.value, userId);
        const normalizations = await getNormalizationsByText(selectedEssay.value, userId);
        text.corrections = normalizations;
        setCurrentText(text);
    }, [selectedEssay]);

    useEffect(() => {
        if (selectedEssay) fetchEssay();
    }, [selectedEssay, fetchEssay]);

    return (
        <section>
            <h1>CorCel 🐴</h1>
            <h2>Plataforma de Normalização Ortográfica</h2>

            <EssaySelector 
                selectedEssay={selectedEssay}
                setSelectedEssay={setSelectedEssay}
            />

            <EssayDisplay 
                essay={currentText}
                refreshEssay={fetchEssay}
            />
        </section>
    );
}

export default MainPage;
