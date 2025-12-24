import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import '../styles/new_correction_popup.css'

import { postNormalization, deleteNormalization } from './api/APIFunctions';

// Displays a popup to confirm the addition of a new candidate

const NewCorrectionPopup = ({ 
    essay, 
    candidate='', 
    isActive, 
    setPopupIsActive, 
    selectedFirstIndex,
    selectedLastIndex,
    setSelectedCandidate, 
    refreshEssay,
    clearSelection}) => {

    const [username, setUsername] = useState(null);

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        setUsername(storedUsername);
    }, []);

    // <> Event handlers <> \\
    const handleCloseButton = () => {
        setSelectedCandidate(null);
        setPopupIsActive(false);
    }

    const handleAddButton = async (event) => {
        if (event) { event.preventDefault(); }

        if(!candidate) await deleteNormalization(essay.id, selectedFirstIndex);
        else           await postNormalization(essay.id, selectedFirstIndex, selectedLastIndex, candidate);
        refreshEssay();
        if (clearSelection) clearSelection();

        setSelectedCandidate(null);
        setPopupIsActive(false);
    };

    if(!isActive)
        return ;

    if(!candidate)
        return (
            <>
            <div className="confirmation-overlay" onClick={handleCloseButton}> 
                <div className="confirmation-dialog">
                    <p><strong>{username}</strong>, você deseja remover a correção?</p>
                    <div className="confirmation-buttons">
                        <button 
                            className="confirm-btn"
                            onClick={handleAddButton}
                            onKeyDown={(event) => {
                                // Call function when ENTER is pressed
                                if (event.key === 'Enter') 
                                    handleAddButton(); 
                            }}
                            tabIndex={0}
                            autoFocus
                        >Remover</button>
                        <button className="cancel-btn" onClick={handleCloseButton}>Cancelar</button>
                    </div>
                </div>
            </div>
            </>
        )

    return (
        <>
        <div className="confirmation-overlay" onClick={handleCloseButton}> 
            <div className="confirmation-dialog">
                <p><strong>{username}</strong>, você deseja adicionar <i>{candidate}</i> como correção?</p>
                <div className="confirmation-buttons">
                    <button 
                        className="confirm-btn"
                        onClick={handleAddButton}
                        onKeyDown={(event) => {
                            // Call function when ENTER is pressed
                            if (event.key === 'Enter') 
                                handleAddButton(); 
                        }}
                        tabIndex={0}
                        autoFocus
                    >Adicionar</button>
                    <button className="cancel-btn" onClick={handleCloseButton}>Cancelar</button>
                </div>
            </div>
        </div>
        </>
    );
};

NewCorrectionPopup.propTypes = {
    essay: PropTypes.object,
    candidate: PropTypes.string,
    selectedFirstIndex: PropTypes.number,
    selectedLastIndex: PropTypes.number,
    isActive: PropTypes.bool,
    setSelectedCandidate: PropTypes.func,
    setPopupIsActive: PropTypes.func,
    refreshEssay: PropTypes.func
};

export default NewCorrectionPopup;