
function createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex){

    // classname = "clickable" - default token
    // classname = "clickable selected" - token is selected (grey background)
    // classname = "clickable corrected" - token has been corrected (blue background)
    // classname = "clickable candidates" - token has possible candidates for correction (red background)

    let token = essay.tokens[i];
    let correction = essay.corrections[i];
    let className = "clickable";
    
    if (i >= selectedStartIndex && i <= selectedEndIndex) className += " selected";
    else if(correction) className+=" corrected";
    else if(token.candidates !== undefined && token.candidates.length > 0) className+=" candidates";

    return( 
        <span 
            key={i} 
            className={i >= selectedStartIndex && i <= selectedEndIndex ? className+' selected' : className}
            onClick={() => { handleSelectedWordIndex(i) ;}} >
            {token.text}
        </span>
    )
} 

function buildText(essay, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex) {
    const tokens_with_space = /[(]|\d+|\n/; // Tokens that need a preceding space
    let token_length = 0;
    const spans = []; 

    for (let i = 0; i < essay.tokens.length; i++) {
        let token = essay.tokens[i];
        let token_text = token.text;
        let token_isWord = token.isWord;
        let correction = essay.corrections[i];

        console.log(token_text);

        i += token_length; // Skip the tokens that were part of a correction
        token_length = 0;

        if(token_isWord) 
        {
            if (i > 0) spans.push(" ");
            if(correction) { token_length = correction.last_index - i; }

            let newSpan = createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex);
            spans.push(newSpan);
        } 
        else if(i > 0 && token_text.match(tokens_with_space)) {
            spans.push(" ");
            spans.push(token_text);
        }
    }
    return <pre>{spans}</pre>;
}

export default buildText;