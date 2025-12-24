import PropTypes from 'prop-types';
import { useState } from 'react';
import buildText from './functions/BuildText';
import '../styles/generated_essay.css';

// Generates the essay: every word must be clickable (wrapped in a span), whilst maintaining
// blank spaces and punctuations.
// Also adds classes for word highlights

const GeneratedEssay = ({ essay, selectedStartIndex, setSelectedStartIndex, selectedEndIndex, setSelectedEndIndex }) => {
    
    const [ctrlPressed, setCtrlPressed] = useState(false);
    
    addEventListener('keydown', (event) => {
        if(event.key === "Control")
            setCtrlPressed(true);
    });
    
    addEventListener('keyup', (event) => {
        if(event.key === "Control")
            setCtrlPressed(false);
    });

    const handleSelectedWordIndex = (selectedOption) => {
        // ctrl is pressed but there is no first index selected
        if(ctrlPressed) {
            if(selectedStartIndex == null){
                setSelectedStartIndex(selectedOption);
            }
        // ctrl is pressed and there is already a first index selected
            else{
                selectedOption < selectedStartIndex ?
                setSelectedStartIndex(selectedOption) : 
                setSelectedEndIndex(selectedOption);
            }
        }
        // ctrl is not pressed, just select the word
        else{
            setSelectedStartIndex(selectedOption);
            setSelectedEndIndex(selectedOption);
        }
    };

    const spans = buildText(essay, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex);

    return (
        <div className="essay-container">
            <div className="document-header">
                <span className="document-title">{essay.sourceFileName}</span>
                {essay.grade !== undefined && essay.grade !== null && (
                    <span className="document-grade">Nota: {essay.grade}</span>
                )}
            </div>
            <div className="document-body">
                {spans}
            </div>
        </div>
    );
};

GeneratedEssay.propTypes = {
    essay: PropTypes.object,
    selectedStartIndex: PropTypes.number,
    setSelectedStartIndex: PropTypes.func,
    selectedEndIndex: PropTypes.number,
    setSelectedEndIndex: PropTypes.func
};

export default GeneratedEssay;