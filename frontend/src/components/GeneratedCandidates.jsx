import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import '../styles/generated_candidates.css'

// Generates the candidate list and the new candidate input.

const GeneratedCandidates = ({ 
    candidates, 
    selectedStartIndex, 
    selectedEndIndex, 
    setSelectedCandidate, 
    setPopupIsActive,
    selectedTokenText,
    singleWordSelected,
    toBeNormalized
}) => {

    const [suggestForAll, setSuggestForAll] = useState(false);
    const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [selectedStartIndex]);

    if(selectedStartIndex == null)
        return null;

    const handleCandidateSelection = (candidate) => {     
        setSelectedCandidate(candidate);
        setPopupIsActive(true);
    };

    const handleConfirmRemove = () => {
        // TODO: Add API call to remove suggestions for the selected token
        console.log('Remove suggestions confirmed');
        setShowRemoveConfirmation(false);
    };

    const hasCandidates = candidates && candidates.length > 0;

    return (
        <div className="candidates-panel">
            <div className="candidates-header">
                {hasCandidates && singleWordSelected ? 'Alternativas para ' : 'Substituir '}
                <span className="selected-token">"{selectedTokenText}"</span>
            </div>
            
            <div className="candidates-list">
                {hasCandidates && singleWordSelected && candidates.map((candidate, index) => (
                    <button 
                        key={index} 
                        className="candidate-button" 
                        onClick={() => handleCandidateSelection(candidate)}
                    >
                        {candidate}
                    </button>
                ))}
                
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
                                setSuggestForAll(false);
                            }
                        }}
                    />
                    <button 
                        className='action-button edit-button' 
                        title="Adicionar correção"
                        onClick={(event) => {
                            const inputElement = event.target.previousElementSibling;
                            handleCandidateSelection(inputElement.value);
                            inputElement.value = '';
                            setSuggestForAll(false);
                        }}
                    > 
                        &#128393; 
                    </button>
                    <button 
                        className='action-button delete-button' 
                        title="Remover token"
                        onClick={() => { 
                            handleCandidateSelection('');
                            setSuggestForAll(false);
                        }}
                    > 
                        &#128465; 
                    </button>
                    <button 
                        className={`action-button remove-suggestions-button ${!toBeNormalized ? 'active-green' : ''}`}
                        title="Remover sugestões"
                        onClick={() => setShowRemoveConfirmation(true)}
                    > 
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                        </svg>
                    </button>
                </div>
            </div>

            {showRemoveConfirmation && (
                <div className="confirmation-overlay">
                    <div className="confirmation-dialog">
                        <p>Marcar token como (in)correto? Isso removerá ou adicionará a marcação de "Não Normalizado"</p>
                        <div className="confirmation-buttons">
                            <button onClick={handleConfirmRemove} className="confirm-btn">Confirmar</button>
                            <button onClick={() => setShowRemoveConfirmation(false)} className="cancel-btn">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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
    toBeNormalized: PropTypes.bool
};

export default GeneratedCandidates;