import PropTypes from 'prop-types';
import '../styles/generated_candidates.css'

// Generates the candidate list and the new candidate input.

const GeneratedCandidates = ({ candidates , selectedWordIndex, setSelectedCandidate, setPopupIsActive }) => {
    const spans = []; // Array to hold the span elements

    if(selectedWordIndex == null)
        return

    const handleCandidateSelection = (candidate) => {     
        setSelectedCandidate(candidate);
        setPopupIsActive(true);
    };

    // Adds the candidate selection buttons
    let i = 0;
    if(candidates)
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
        <span key={i}>        
            <input
                placeholder="NOVA CORREÇÃO"
                className="clickable"
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        // Call function when ENTER is pressed
                        handleCandidateSelection(event.target.value); 
                        event.target.blur(); // Defocus the input after pressing ENTER
                        event.target.value = '';
                    }
                }}
            />
            <button className='addButton' onClick={(event) => {
                const inputElement = event.target.previousElementSibling;  // Get the previous input element
                handleCandidateSelection(inputElement.value);  // Trigger the same function as Enter
                inputElement.value = '';  // Clear the input value after adding
            }}> &#128393; </button>
            <button className='addButton' onClick={() => { 
                handleCandidateSelection('');
            }}> &#128465; </button>
        </span>
    );

    return <>{spans}</>;
};

GeneratedCandidates.propTypes = {
    candidates: PropTypes.array,
    selectedWordIndex: PropTypes.number,
    setSelectedCandidate: PropTypes.func,
    setPopupIsActive: PropTypes.func
};

export default GeneratedCandidates;