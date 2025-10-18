import PropTypes from 'prop-types';
import { useState } from 'react';
import '../styles/generated_candidates.css'

// Generates the candidate list and the new candidate input.

const GeneratedCandidates = ({ candidates , selectedStartIndex, selectedEndIndex, setSelectedCandidate, setPopupIsActive }) => {

    const [suggestForAll, setSuggestForAll] = useState(false);

    const spans = []; // Array to hold the span elements

    if(selectedStartIndex == null)
        return

    const handleCandidateSelection = (candidate) => {     
        setSelectedCandidate(candidate);
        setPopupIsActive(true);
    };

    // Adds the candidate selection buttons
    let i = 0;
    if(candidates && selectedEndIndex === selectedStartIndex)
        for(;i<candidates.length;i++) {
            const candidate = candidates[i];
            spans.push(' ');
            spans.push(<span 
                key={i} 
                className="clickable" 
                onClick={() => handleCandidateSelection(candidate)}>
                    {candidate}
                </span>);
            spans.push(' | ');
        }

    // Adds the new candidate button
    spans.push(
        <span key={i} style={{display: 'inline'}}>        
            <input
                placeholder="NOVA CORREÇÃO"
                className="clickable"
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        // Call function when ENTER is pressed
                        handleCandidateSelection(event.target.value); 
                        event.target.blur(); // Defocus the input after pressing ENTER
                        event.target.value = '';
                        setSuggestForAll(false);

                    }
                }}
            />
            <button className='addButton' onClick={(event) => {
                const inputElement = event.target.previousElementSibling;  // Get the previous input element
                handleCandidateSelection(inputElement.value);  // Trigger the same function as Enter
                inputElement.value = '';  // Clear the input value after adding
                setSuggestForAll(false);

            }}> &#128393; </button>
            <button className='addButton' onClick={() => { 
                handleCandidateSelection('');
                setSuggestForAll(false);

            }}> &#128465; </button>
        </span>
    );
            //<span className="checkbox-wrapper-47" style={{display: 'inline-block', marginLeft: '10px' }}>
            //    <input 
            //        type="checkbox"
            //        name="cb"
            //        id="cb-48"
            //        checked={suggestForAll}
            //        onChange={(e) => setSuggestForAll(e.target.checked)}
            //    />
            //    <label htmlFor="cb-48" 
            //    title='Adiciona o novo token como sugestão para todas as ocorrências da palavra substituída na plataforma.'>
            //        Sugestão Global &#x1F6C8;
            //    </label>  
            //</span>

    return <>{spans}</>;
};

GeneratedCandidates.propTypes = {
    candidates: PropTypes.array,
    selectedWordIndex: PropTypes.number,
    setSelectedCandidate: PropTypes.func,
    setPopupIsActive: PropTypes.func
};

export default GeneratedCandidates;