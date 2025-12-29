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
    clearSelection,
    suggestForAll = false,
    tokenPosition
}) => {

    const [username, setUsername] = useState(null);
    const tokenText = essay.tokens[selectedFirstIndex]?.text || '';

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
        else           await postNormalization(essay.id, selectedFirstIndex, selectedLastIndex, candidate, suggestForAll);
        refreshEssay();
        // if (clearSelection) clearSelection();

        setSelectedCandidate(null);
        setPopupIsActive(false);
    };

    if(!isActive)
        return ;

    let dialogStyle = {};
    if (tokenPosition) {
        const viewportTop = tokenPosition.top - window.scrollY;
        const viewportLeft = tokenPosition.left - window.scrollX;
        const isBottomHalf = viewportTop > window.innerHeight / 2;

        dialogStyle = {
            position: 'fixed',
            left: viewportLeft,
            transform: 'none',
            margin: 0,
            zIndex: 1001
        };

        if (isBottomHalf) {
            dialogStyle.bottom = (window.innerHeight - viewportTop) + 10;
            dialogStyle.top = 'auto';
        } else {
            dialogStyle.top = viewportTop + 40;
            dialogStyle.bottom = 'auto';
        }
    }

    if(!candidate)
        return (
            <>
            <div className="confirmation-overlay" onClick={handleCloseButton}> 
                <div className="confirmation-dialog" style={dialogStyle}>
                <p>{username ? <><strong>{username}</strong>, </> : ''}você deseja remover a correção?</p>
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
            <div className="confirmation-dialog" style={dialogStyle}>
                <p>
                    {username ? <><strong>{username}</strong>, </> : ''}você deseja adicionar <i>{candidate}</i> como correção
                    {suggestForAll ? ` para todas as ocorrências de "${tokenText}"? Isso afetará todos os textos` : '?'}
                </p>
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
    refreshEssay: PropTypes.func,
    clearSelection: PropTypes.func,
    suggestForAll: PropTypes.bool,
    tokenPosition: PropTypes.object
};

export default NewCorrectionPopup;