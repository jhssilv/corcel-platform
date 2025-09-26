function buildText(essay, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex) {
    const tokens_with_space = /[(]|\d+/; // Tokens that need a preceding space
    let token_length = 0;
    const spans = []; // Array to hold the span elements

    for (let i = 0; i < essay.tokens.length; i++) {
        let token = essay.tokens[i];
        i += token_length; // Skip the tokens that were part of a correction
        token_length = 0;

        if(essay.word_map[i]) {
            // Add a space before every word except the first
            if (i > 0)
                spans.push(" ");

            let className = "clickable" // We use the className to highlight the words

            // If there is a correction for given word index, we substitute the token for
            // its correction
            const correction = essay.corrections[i];
            if(correction) {
                token = correction[0];
                className+=" corrected";
                token_length = correction[1] - i;
            }

            // If there are possible candidates for correction
            if(essay.candidates[i])
                className+=" candidates"
            
            spans.push(
            <span 
                key={i} 
                className={i >= selectedStartIndex && i <= selectedEndIndex ? className+' selected' : className}
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

}

export default buildText;