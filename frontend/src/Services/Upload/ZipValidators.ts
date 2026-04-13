import JSZip from "jszip";

export interface ZipValidationResult {
	isValid: boolean;
	error?: string;
}

export async function validateImageZipFile(
	file: File,
): Promise<ZipValidationResult> {
	if (!file.name.toLowerCase().endsWith(".zip")) {
		return { isValid: false, error: "O arquivo deve ser um ZIP." };
	}

	try {
		const zip = new JSZip();
		const zipContents = await zip.loadAsync(file);
		const files = Object.keys(zipContents.files);
		const fileEntries = files.filter((name) => !zipContents.files[name].dir);

		if (fileEntries.length === 0) {
			return { isValid: false, error: "O arquivo ZIP está vazio." };
		}

		const validExtensions = [".png", ".jpg", ".jpeg", ".tif", ".tiff"];
		const allImages = fileEntries.every((name) => {
			if (name.startsWith("__MACOSX") || name.startsWith(".")) {
				return true;
			}

			const lower = name.toLowerCase();
			return validExtensions.some((extension) => lower.endsWith(extension));
		});

		if (!allImages) {
			return {
				isValid: false,
				error: "O ZIP deve conter apenas imagens (png, jpg, tif, tiff).",
			};
		}

		return { isValid: true };
	} catch (error) {
		console.error("ZIP validation error:", error);
		return { isValid: false, error: "Erro ao processar o arquivo ZIP." };
	}
}
