import { useEffect, useState } from "react";
import { parseTextFile } from "../../Services/Text/FileParsers";
import { addToWhitelist, getWhitelist, removeFromWhitelist } from "../../Api";
import {
	Stack,
	Button,
	FormField,
	DropZone,
	ModalScaffold,
	TextArea,
} from "../Generic";
import { useSnackbar } from "../../Context/Generic";

interface WhitelistModalProps {
	isOpen: boolean;
	onClose: () => void;
}

function WhitelistModal({ isOpen, onClose }: WhitelistModalProps) {
	const [whitelistText, setWhitelistText] = useState("");
	const [originalWhitelistText, setOriginalWhitelistText] = useState("");
	const [isUpdating, setIsUpdating] = useState(false);
	const { addSnackbar } = useSnackbar();

	useEffect(() => {
		const fetchWhitelist = async () => {
			try {
				const whitelistedWords = await getWhitelist();
				const joined = whitelistedWords.tokens.join(", ");
				setWhitelistText(joined);
				setOriginalWhitelistText(joined);
			} catch (error) {
				console.error("Handle API fetch error:", error);
				addSnackbar({
					text: "Falha ao carregar a whitelist.",
					type: "error",
				});
			}
		};

		if (isOpen) {
			void fetchWhitelist();
		}
	}, [isOpen, addSnackbar]);

	const handleUpdate = async () => {
		setIsUpdating(true);
		try {
			const originalWords = originalWhitelistText
				.split(",")
				.map((word) => word.trim())
				.filter((word) => word.length > 0);
			const updatedWords = whitelistText
				.split(",")
				.map((word) => word.trim())
				.filter((word) => word.length > 0);

			const wordsToAdd = updatedWords.filter(
				(word) => !originalWords.includes(word),
			);
			const wordsToRemove = originalWords.filter(
				(word) => !updatedWords.includes(word),
			);

			for (const word of wordsToAdd) {
				await addToWhitelist(word);
			}

			for (const word of wordsToRemove) {
				await removeFromWhitelist(word);
			}

			await new Promise((resolve) => setTimeout(resolve, 500));
			setOriginalWhitelistText(whitelistText);
			addSnackbar({
				text: "Whitelist atualizada com sucesso!",
				type: "success",
			});
			onClose();
		} catch (error) {
			console.error("Error updating whitelist:", error);
			addSnackbar({
				text: "Houve um erro ao atualizar a whitelist.",
				type: "error",
			});
		} finally {
			setIsUpdating(false);
		}
	};

	const handleCancel = () => {
		setWhitelistText(originalWhitelistText);
		onClose();
	};

	const handleDropFiles = async (files: File[]) => {
		const textFiles = files.filter(
			(file) => file.type === "text/plain" || file.name.endsWith(".txt"),
		);

		if (textFiles.length === 0) {
			return;
		}

		try {
			const allTokens: string[] = [];

			for (const file of textFiles) {
				const tokens = await parseTextFile(file);
				allTokens.push(...tokens);
			}

			if (allTokens.length > 0) {
				setWhitelistText((previous) => {
					const separator = previous.trim() ? ", " : "";
					return previous + separator + allTokens.join(", ");
				});
			}
		} catch (error) {
			console.error("Error parsing files:", error);
			addSnackbar({
				text: "Erro ao ler arquivos de texto.",
				type: "error",
			});
		}
	};

	const hasTextChanged = whitelistText !== originalWhitelistText;

	return (
		<ModalScaffold
			isOpen={isOpen}
			onClose={handleCancel}
			title="Gerenciar Whitelist"
			footer={
				<>
					<Button
						tier="secondary"
						variant="neutral"
						onClick={handleCancel}
						disabled={isUpdating}
					>
						Cancelar
					</Button>
					<Button
						tier="primary"
						variant="action"
						onClick={() => {
							void handleUpdate();
						}}
						disabled={!hasTextChanged || isUpdating}
						isLoading={isUpdating}
					>
						Atualizar
					</Button>
				</>
			}
		>
			<Stack direction="vertical" gap={12}>
				<FormField
					label="Lista de palavras (separadas por vírgula):"
					htmlFor="whitelist-textarea"
				>
					<DropZone
						dragOverlayText="Solte os arquivos aqui"
						enableClickSelect={false}
						accept=".txt,text/plain"
						onFilesDropped={(files) => {
							void handleDropFiles(files);
						}}
					>
						<TextArea
							id="whitelist-textarea"
							variant="editor"
							value={whitelistText}
							onChange={(event) => setWhitelistText(event.target.value)}
							placeholder="Digite as palavras separadas por vírgula ou arraste arquivos de texto aqui..."
							rows={15}
						/>
					</DropZone>
				</FormField>
			</Stack>
		</ModalScaffold>
	);
}

export default WhitelistModal;
