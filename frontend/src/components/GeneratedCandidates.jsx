import PropTypes from 'prop-types';
import { useState } from 'react';
import '../styles/generated_candidates.css'

// Generates the candidate list and the new candidate input.

const GeneratedCandidates = ({ 
    candidates, 
    selectedStartIndex, 
    selectedEndIndex, 
    setSelectedCandidate, 
    setPopupIsActive,
    selectedTokenText,
    singleWordSelected
}) => {

    const [suggestForAll, setSuggestForAll] = useState(false);

    if(selectedStartIndex == null || !singleWordSelected)
        return null;

    const handleCandidateSelection = (candidate) => {     
        setSelectedCandidate(candidate);
        setPopupIsActive(true);
    };

    const hasCandidates = candidates && candidates.length > 0;

    return (
        <div className="candidates-panel">
            <div className="candidates-header">
                {hasCandidates ? 'Alternativas para ' : 'Substituir '}
                <span className="selected-token">"{selectedTokenText}"</span>
            </div>
            
            <div className="candidates-list">
                {hasCandidates && candidates.map((candidate, index) => (
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
                </div>
            </div>
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
    singleWordSelected: PropTypes.bool
};

export default GeneratedCandidates;