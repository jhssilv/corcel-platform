import PropTypes from 'prop-types';
import '../styles/generated_essay.css';

// Generates the essay: every word must be clickable (wrapped in a span), whilst maintaining
// blank spaces and punctuations.
// Also adds classes for word higlights

const GeneratedEssay = ({ essay, selectedWordIndex, setSelectedWordIndex }) => {
    const spans = []; // Array to hold the span elements
    const tokens_with_space = /[(]|\d+/; // Tokens that need a preceding space

    const handleSelectedWordIndex = (selectedOption) => {
        setSelectedWordIndex(selectedOption);
    };

    for (let i = 0; i < essay.tokens.length; i++) {
        let token = essay.tokens[i];

        if(essay.word_map[i]) {
            // Add a space before every word except the first
            if (i > 0)
                spans.push(" ");

            let className = "clickable" // We use the className to highlight the words

            // If there is a correction for given word index, we substitute the token for
            // its correction
            const correction = essay.corrections[i];
            if(correction) {
                token = correction;
                className+=" corrected"
            }

            // If there are possible candidates for correction
            if(essay.candidates[i])
                className+=" candidates"
            
            spans.push(
            <span 
                key={i} 
                className={i === selectedWordIndex ? className+' selected' : className}
                onClick={() => {
                    handleSelectedWordIndex(i);
                    
                }} 
                >{token}</span>);
        } else {
            // Some special chars need preceding space
            if (i > 0 && token.match(tokens_with_space))
                spans.push(" ");
            // Add punctuation directly without a span
            spans.push(token);
        }   
    }

    return <pre>{spans}</pre>;
};

GeneratedEssay.propTypes = {
    essay: PropTypes.object,
    selectedWordIndex: PropTypes.number,
    setSelectedWordIndex: PropTypes.func
};

export default GeneratedEssay;