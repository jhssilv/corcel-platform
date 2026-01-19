
function createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex, animatedIndices, animationNonceByIndex, setHoveredIndex, highlightRange){

    // classname = "clickable" - default token
    // classname = "clickable selected" - token is selected (grey background)
    // classname = "clickable corrected" - token has been corrected (blue background)
    // classname = "clickable candidates" - token has possible candidates for correction (red background)

    //console.log(essay.tokens);

    let token = essay.tokens[i];
    let correction = essay.corrections[i];
    let toBeNormalized = token.toBeNormalized;
    let whitelisted = token.whitelisted;
    let className = "clickable";

    if(correction) className+=" corrected";
    else if(toBeNormalized && !whitelisted) className+=" candidates";

    if (i >= selectedStartIndex && i <= selectedEndIndex) className += " selected";
    if (animatedIndices && animatedIndices.has(i)) className += " token-updated";
    
    // Check if within highlight range
    if(highlightRange) {
        if(highlightRange.start === i) { 
             // Logic: any rendered token corresponds to a start index in the original tokens array (because we skip the rest if corrected)
             // So checking if we are at the start of the highlight range is usually sufficient if the highlight range corresponds to the semantic unit (word/phrase) being rendered here.
             className += " highlight-hover";
        }
    }

    let token_text = essay.corrections && essay.corrections[i] ? essay.corrections[i].new_token : token.text;

    return( 
        <span 
            key={`${i}-${animationNonceByIndex?.[i] || 0}`} 
            className={className}
            onClick={(event) => { handleSelectedWordIndex(i, event) ;}} 
            onMouseEnter={() => setHoveredIndex && setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex && setHoveredIndex(null)}
        >
            {token_text}
        </span>
    )
} 

function buildText(essay, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex, animatedIndices, animationNonceByIndex, setHoveredIndex, highlightRange) {
    let token_length = 0;
    const spans = []; 

    for (let i = 0; i < essay.tokens.length; i++) {
        let token = essay.tokens[i];
        let correction = essay.corrections[i];

        token_length = 0;
        
        if(token.isWord){
            spans.push(createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex, animatedIndices, animationNonceByIndex, setHoveredIndex, highlightRange));
        }
        else{
            spans.push(token.text);
        }
        
        if(token.whitespaceAfter == " "){
            spans.push(" ");
        }

        if(correction){
           token_length =  correction.last_index - i;
        }

        i += token_length; // Skip the tokens that were part of a correction

    }
    return spans;
}

export default buildText;