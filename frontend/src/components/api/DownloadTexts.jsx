import { requestDownload } from "./APIFunctions";

const downloadTexts = async (useBrackets) => {
    const storedIds = localStorage.getItem('textIds');
    const textIds = storedIds ? JSON.parse(storedIds) : null;

    if (!textIds) { throw new Error("No text IDs found");}

    try {
        const response = await requestDownload(textIds, useBrackets);
        return response;
    } catch (error) {
        console.error("Error downloading texts:", error);
        throw error;
    }
};

export default downloadTexts;
