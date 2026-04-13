/**
 * Parses a text file and extracts alphabetic tokens.
 */
export const parseTextFile = (file: File): Promise<string[]> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event: ProgressEvent<FileReader>) => {
			const text = event.target?.result;

			if (typeof text !== "string") {
				resolve([]);
				return;
			}

			const tokens = text.match(/[\p{L}]+/gu) || [];
			resolve(tokens);
		};

		reader.onerror = (error) => {
			reject(error);
		};

		reader.readAsText(file);
	});
};
