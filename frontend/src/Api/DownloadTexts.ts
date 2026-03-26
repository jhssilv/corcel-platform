import { requestDownload } from './DownloadApi';

const downloadTexts = async (useBrackets: boolean) => {
    const storedIds = localStorage.getItem('textIds');
    const parsed = storedIds ? (JSON.parse(storedIds) as unknown) : null;

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('No text IDs found');
    }

    const textIds = parsed.filter((value): value is number => typeof value === 'number');

    try {
        return await requestDownload(textIds, useBrackets);
    } catch (error) {
        console.error('Error downloading texts:', error);
        throw error;
    }
};

export default downloadTexts;