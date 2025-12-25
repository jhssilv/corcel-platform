/**
 * Parses a text file and extracts alphabetic tokens.
 * @param {File} file - The file to parse.
 * @returns {Promise<string[]>} - A promise that resolves to an array of tokens.
 */
export const parseTextFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const text = event.target.result;
            // Regex to match alphabetic tokens (including Portuguese characters)
            // \p{L} matches any unicode letter
            const tokens = text.match(/[\p{L}]+/gu) || [];
            resolve(tokens);
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsText(file);
    });
};
