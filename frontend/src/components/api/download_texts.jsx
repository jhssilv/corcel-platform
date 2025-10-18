import { requestDownload } from "./api_functions";

const downloadTexts = async (useBrackets) => {
    const storedIds = localStorage.getItem('textIds');
    const textIds = storedIds ? JSON.parse(storedIds) : null;
    const userId = JSON.parse(localStorage.getItem('userId'));

    if (!textIds) { throw new Error("No text IDs found");}
    if (!userId)  { throw new Error("No user ID found");}

    try {
        const response = await requestDownload(textIds, useBrackets, userId);
        return response;
    } catch (error) {
        console.error("Error downloading texts:", error);
        throw error;
    }
};

export default downloadTexts;
