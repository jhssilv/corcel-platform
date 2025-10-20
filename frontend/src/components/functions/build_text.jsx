
function createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex){

    // classname = "clickable" - default token
    // classname = "clickable selected" - token is selected (grey background)
    // classname = "clickable corrected" - token has been corrected (blue background)
    // classname = "clickable candidates" - token has possible candidates for correction (red background)

    //console.log(essay.tokens);

    let token = essay.tokens[i];
    let correction = essay.corrections[i];
    let className = "clickable";
    
    if (i >= selectedStartIndex && i <= selectedEndIndex) className += " selected";
    else if(correction) className+=" corrected";
    else if(token.candidates !== undefined && token.candidates.length > 0) className+=" candidates";

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
    const NO_SPACE_BEFORE = [':', ',', '.', ')', '}', '?', '!', ']', '\n', '\t', ';', ' ']; // Tokens that need a preceding space
    const NO_SPACE_AFTER = ['{', '(', '[', '#', '\n', '\t', ' '];
    let QUOTE_CHARS = ['"', '“', '”', '‘', '’', "'"];
    let quote_opened = false;
    let token_length = 0;
    const spans = []; 

    for (let i = 0; i < essay.tokens.length; i++) {
        let token = essay.tokens[i];

        i += token_length; // Skip the tokens that were part of a correction
        token_length = 0;

        if(i === 0){
            spans.push(createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex));
            spans.push(' ');
            continue;
        }

        if(QUOTE_CHARS.includes(token.text)){
            quote_opened = !quote_opened;
            if(quote_opened){
                spans.push(token.text);
            }
            else{
                spans.pop();
                spans.push(createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex));
                spans.push(' ');
            }
        }
        else if(NO_SPACE_BEFORE.includes(token.text)) {
            spans.pop();
            spans.push(token.text);
            spans.push(' ');
        }
        else if(NO_SPACE_AFTER.includes(token.text)) {
            spans.push(token.text);
        }
        else {
            spans.push(createSpan(essay, i, selectedStartIndex, selectedEndIndex, handleSelectedWordIndex));
            spans.push(' ');
        }
    }
    return <pre>{spans}</pre>;
}

export default buildText;