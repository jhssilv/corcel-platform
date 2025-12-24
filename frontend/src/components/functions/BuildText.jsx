
function createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex){

    // classname = "clickable" - default token
    // classname = "clickable selected" - token is selected (grey background)
    // classname = "clickable corrected" - token has been corrected (blue background)
    // classname = "clickable candidates" - token has possible candidates for correction (red background)

    //console.log(essay.tokens);

    let token = essay.tokens[i];
    let correction = essay.corrections[i];
    let toBeNormalized = token.toBeNormalized;
    let className = "clickable";

    if(correction) className+=" corrected";
    else if(toBeNormalized ) className+=" candidates";

    if (i >= selectedStartIndex && i <= selectedEndIndex) className += " selected";

    let token_text = essay.corrections && essay.corrections[i] ? essay.corrections[i].new_token : token.text;

    return( 
        <span 
            key={i} 
            className={className}
            onClick={() => { handleSelectedWordIndex(i) ;}} >
            {token_text}
        </span>
    )
} 

function buildText(essay, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex) {
    let token_length = 0;
    const spans = []; 

    for (let i = 0; i < essay.tokens.length; i++) {
        let token = essay.tokens[i];
        let correction = essay.corrections[i];

        token_length = 0;
        
        if(token.isWord){
            spans.push(createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex));
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