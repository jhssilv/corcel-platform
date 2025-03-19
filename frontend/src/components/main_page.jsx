import { useState, useEffect, useCallback } from 'react';
import '../styles/main_page.css';
import EssaySelector from './essay_selector.jsx';
import EssayDisplay from './essay_display.jsx';

// MAIN PAGE COMPONENT \\

function MainPage() {
    const [selectedEssay, setSelectedEssay] = useState(null);
    const [essayData, setEssayData] = useState(null);

    const fetchEssay = useCallback(async () => {
        try {
            const response = await fetch('/api/essay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedEssay),
            });
    
            if (!response.ok) {
                throw new Error('Error fetching essay');
            }
    
            const data = await response.json();
            console.log('Fetched data:', data); // Check if the new corrections are present
            setEssayData({ ...data }); // Ensure a new reference
        } catch (error) {
            console.error(error);
        }
    }, [selectedEssay]);

    useEffect(() => {
        if (selectedEssay) fetchEssay();
    }, [selectedEssay, fetchEssay]);

    return (
        <section>
            <h1>CorCel</h1>
            <h2>Corretor de textos</h2>

            <EssaySelector 
                selectedEssay={selectedEssay}
                setSelectedEssay={setSelectedEssay}
            />
                
            <EssayDisplay 
                essay={essayData}
                refreshEssay={fetchEssay}
            />
        </section>
    );
}

export default MainPage;
