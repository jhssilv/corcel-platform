import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import '../styles/new_correction_popup.css'

// Displays a popup to confirm the addition of a new candidate

const NewCorrectionPopup = ({ 
    essay, 
    candidate='', 
    selectedWordIndex, 
    isActive, 
    setPopupIsActive, 
    setSelectedCandidate, 
    refreshEssay}) => {

    const [loggedUser, setLoggedUser] = useState(null);

    // Gets the username
    useEffect(() => {
        const username = localStorage.getItem('loggedUser');
        if (username) {
            setLoggedUser(username);
        }  
    }, []);

    const handleCloseButton = () => {
        setSelectedCandidate(null);
        setPopupIsActive(false);
    }

    const handleAddButton = async (event) => {
        if (event) {
            event.preventDefault(); // Only call preventDefault if event exists
        }
    
        const payload = {
            essay_id: essay.index,
            word_index: selectedWordIndex,
            correction: candidate,
            author: loggedUser,
        };
    
        try {
            const response = await fetch('/api/correction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
    
            if (response.ok) {
                console.log(await response.text());
                refreshEssay(); // Trigger a refresh of the essay
            } else {
                console.error('Failed to save correction:', await response.text());
            }
        } catch (error) {
            console.error('Error saving correction:', error);
        }
    
        setSelectedCandidate(null);
        setPopupIsActive(false);
    };

    if(!isActive)
        return ;

    if(!candidate)
        return (
            <>
            <div className="overlay" onClick={handleCloseButton}> 
                <div className="popup">
                    <p><strong>{loggedUser}</strong>, você deseja remover a correção?</p>
                    <button 
                        onClick={handleAddButton}
                        onKeyDown={(event) => {
                            // Call function when ENTER is pressed
                            if (event.key === 'Enter') 
                                handleAddButton(); 
                        }}
                        tabIndex={0}
                        autoFocus
                    >Remover</button>
                    <button onClick={handleCloseButton}>Cancelar</button>
                </div>
            </div>
            </>
        )

    return (
        <>
        <div className="overlay" onClick={handleCloseButton}> 
            <div className="popup">
                <p><strong>{loggedUser}</strong>, você deseja adicionar <i>{candidate}</i> como correção?</p>
                <button 
                    onClick={handleAddButton}
                    onKeyDown={(event) => {
                        // Call function when ENTER is pressed
                        if (event.key === 'Enter') 
                            handleAddButton(); 
                    }}
                    tabIndex={0}
                    autoFocus
                >Adicionar</button>
                <button onClick={handleCloseButton}>Cancelar</button>
            </div>
        </div>
        </>
    );
};

NewCorrectionPopup.propTypes = {
    essay: PropTypes.object,
    candidate: PropTypes.string,
    selectedWordIndex: PropTypes.number,
    isActive: PropTypes.bool,
    setSelectedCandidate: PropTypes.func,
    setPopupIsActive: PropTypes.func,
    refreshEssay: PropTypes.func
};

export default NewCorrectionPopup;