import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import '../styles/generated_candidates.css'

import { toggleToBeNormalized } from './api/APIFunctions';

// Generates the candidate list and the new candidate input.

const GeneratedCandidates = ({ 
    candidates, 
    selectedStartIndex, 
    selectedEndIndex, 
    setSelectedCandidate, 
    setPopupIsActive,
    selectedTokenText,
    singleWordSelected,
    toBeNormalized,
    refreshEssay,
    suggestForAll,
    setSuggestForAll,
    onClose,
    tokenId,
    tokenPosition
}) => {

    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
        setSuggestForAll(false);
    }, [selectedStartIndex]);

    if(selectedStartIndex == null)
        return null;

    const handleCandidateSelection = (candidate) => {     
        setSelectedCandidate(candidate);
        setPopupIsActive(true);
    };

    const handleConfirmRemove = async () => {

        // I don't really know why the +1, but it works
        await toggleToBeNormalized(tokenId);
        refreshEssay();
        setShowRemoveConfirmation(false);
    };

    const hasCandidates = candidates && candidates.length > 0;

    return (
        <>
        {/* Floating Candidates List */}
        {hasCandidates && singleWordSelected && tokenPosition && (
            <div 
                className="floating-candidates-list"
                style={{
                    position: 'absolute',
                    top: tokenPosition.top - 10, // 10px padding
                    left: tokenPosition.left,
                    transform: 'translateY(-100%)',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '5px',
                    flexWrap: 'wrap',
                    maxWidth: '300px'
                }}
            >
                {candidates.map((candidate, index) => (
                    <button 
                        key={index} 
                        className="candidate-button" 
                        onClick={() => handleCandidateSelection(candidate)}
                        style={{ width: 'auto' }} // Override full width
                    >
                        {candidate}
                    </button>
                ))}
            </div>
        )}

        <div className="candidates-panel">
            <button className="close-panel-button" onClick={onClose} title="Fechar painel">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
            </button>
            <div className="candidates-header">
                {hasCandidates && singleWordSelected ? 'Alternativas para ' : 'Substituir '}
                <span className="selected-token">"{selectedTokenText}"</span>
            </div>
            
            {/* Candidates list removed from here */}
                
            <div className="panel-footer">
                <div className="new-candidate-container">
                    <input
                        ref={inputRef}
                        placeholder="Novo Token"
                        className="new-candidate-input"
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                handleCandidateSelection(event.target.value); 
                                event.target.blur();
                                event.target.value = '';
                            }
                        }}
                    />
                    <button 
                        className='action-button edit-button' 
                        title="Substituir Token"
                        onClick={(event) => {
                            const inputElement = event.target.previousElementSibling;
                            handleCandidateSelection(inputElement.value);
                            inputElement.value = '';
                        }}
                    > 
                        &#128393; 
                    </button>
                    <button 
                        className='action-button delete-button' 
                        title="Remover Substituição"
                        onClick={() => { 
                            handleCandidateSelection('');
                        }}
                    > 
                        &#128465; 
                    </button>
                    <button 
                        className={`action-button remove-suggestions-button ${!toBeNormalized ? 'active-green' : ''}`}
                        title="Remover Marcação de Não Normalizado"
                        onClick={() => setShowRemoveConfirmation(true)}
                    > 
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                        </svg>
                    </button>
                </div>
                
                <div className="global-suggestion-container">
                    <label className="global-suggestion-label">
                        <input 
                            type="checkbox" 
                            checked={suggestForAll} 
                            onChange={(e) => setSuggestForAll(e.target.checked)} 
                        />
                        Sugestão Global
                    </label>
                    <div className="info-tooltip-container">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="info-icon">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <div className="tooltip-text">
                            Ao marcar esta opção, o novo token será sugerida para todas as ocorrências deste token nos textos.
                        </div>
                    </div>
                </div>
            </div>

            {showRemoveConfirmation && (
                <div className="confirmation-overlay">
                    <div className="confirmation-dialog">
                        <p>Marcar token como (in)correto? Isso apenas removerá ou adicionará a marcação de "Não Normalizado"</p>
                        <div className="confirmation-buttons">
                            <button onClick={handleConfirmRemove} className="confirm-btn">Confirmar</button>
                            <button onClick={() => setShowRemoveConfirmation(false)} className="cancel-btn">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

GeneratedCandidates.propTypes = {
    candidates: PropTypes.array,
    selectedStartIndex: PropTypes.number,
    selectedEndIndex: PropTypes.number,
    setSelectedCandidate: PropTypes.func,
    setPopupIsActive: PropTypes.func,
    selectedTokenText: PropTypes.string,
    singleWordSelected: PropTypes.bool,
    toBeNormalized: PropTypes.bool,
    onClose: PropTypes.func,
    tokenId: PropTypes.number,
    tokenPosition: PropTypes.object
};

export default GeneratedCandidates;