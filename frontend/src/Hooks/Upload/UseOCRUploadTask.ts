import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type DragEvent,
} from "react";
import { getTaskStatus, uploadOCRArchive } from "../../Api";
import { validateImageZipFile } from "../../Services/Upload/ZipValidators";
import { useSnackbar } from "../../Context/Generic";

interface UploadErrorShape {
	message?: string;
	error?: string;
}

interface UseOCRUploadTaskOptions {
	storageKey?: string;
	onUploadComplete?: () => void;
	onSuccess?: () => void;
	resetOnSuccess?: boolean;
	successDelayMs?: number;
}

export function UseOCRUploadTask({
	storageKey = "currentOCRTaskId",
	onUploadComplete,
	onSuccess,
	resetOnSuccess = false,
	successDelayMs = 2000,
}: UseOCRUploadTaskOptions = {}) {
	const [uploadFile, setUploadFile] = useState<File | null>(null);
	const [hasError, setHasError] = useState(false);
	const { addSnackbar } = useSnackbar();
	const [isValidZip, setIsValidZip] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [isValidating, setIsValidating] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);
	const [statusMessage, setStatusMessage] = useState("");
	const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

	const clearFileSelection = useCallback(() => {
		setUploadFile(null);
		setIsValidZip(false);
		setHasError(false);
	}, []);

	const resetState = useCallback(() => {
		clearFileSelection();
		setIsDragging(false);
		setIsProcessing(false);
		setProgress(0);
		setStatusMessage("");
		if (pollingInterval.current) {
			clearInterval(pollingInterval.current);
			pollingInterval.current = null;
		}
	}, [clearFileSelection]);

	const validateZipFile = useCallback(
		async (file: File) => {
			setIsValidating(true);
			setHasError(false);
			setIsValidZip(false);

			const result = await validateImageZipFile(file);
			if (!result.isValid) {
				setHasError(true);
				addSnackbar({
					text: result.error || "Erro ao validar ZIP.",
					type: "error",
				});
				setIsValidating(false);
				return;
			}

			setIsValidZip(true);
			setIsValidating(false);
		},
		[addSnackbar],
	);

	const pollStatus = useCallback(
		(taskId: string) => {
			setStatusMessage("Aguardando início do processamento...");

			pollingInterval.current = setInterval(async () => {
				try {
					const data = await getTaskStatus(taskId);

					if (data.state === "PROGRESS") {
						if (
							typeof data.total === "number" &&
							data.total > 0 &&
							typeof data.current === "number"
						) {
							const percent = Math.round((data.current / data.total) * 100);
							setProgress(percent);
						}

						setStatusMessage(data.status || "Processando imagens...");
						return;
					}

					if (data.state === "SUCCESS") {
						if (pollingInterval.current) {
							clearInterval(pollingInterval.current);
							pollingInterval.current = null;
						}

						setIsProcessing(false);
						setProgress(100);
						setStatusMessage("Processamento concluído!");
						localStorage.removeItem(storageKey);
						onUploadComplete?.();

						setTimeout(() => {
							if (resetOnSuccess) {
								setUploadFile(null);
								setIsValidZip(false);
								setProgress(0);
								setStatusMessage("");
							}
							onSuccess?.();
						}, successDelayMs);

						return;
					}

					if (data.state === "FAILURE") {
						if (pollingInterval.current) {
							clearInterval(pollingInterval.current);
							pollingInterval.current = null;
						}

						setIsProcessing(false);
						setHasError(true);
						addSnackbar({
							text: "Falha no processamento.",
							type: "error",
							duration: 5000,
						});
						localStorage.removeItem(storageKey);
					}
				} catch (error) {
					console.error("Polling error:", error);
				}
			}, 2000);
		},
		[
			onSuccess,
			onUploadComplete,
			resetOnSuccess,
			storageKey,
			successDelayMs,
			addSnackbar,
		],
	);

	useEffect(() => {
		const savedTaskId = localStorage.getItem(storageKey);
		if (savedTaskId && !pollingInterval.current) {
			setIsProcessing(true);
			pollStatus(savedTaskId);
		}

		return () => {
			if (pollingInterval.current) {
				clearInterval(pollingInterval.current);
			}
		};
	}, [pollStatus, storageKey]);

	const handleFileSelect = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				return;
			}

			setUploadFile(file);
			void validateZipFile(file);
		},
		[validateZipFile],
	);

	const handleUpload = useCallback(async () => {
		if (!uploadFile || !isValidZip) {
			return;
		}

		setIsProcessing(true);
		setHasError(false);
		setStatusMessage("Enviando arquivo...");

		try {
			const response = await uploadOCRArchive(uploadFile);
			const taskId = response.task_id;

			if (!taskId) {
				setHasError(true);
				addSnackbar({
					text: "O servidor não retornou um ID de tarefa.",
					type: "error",
				});
				setIsProcessing(false);
				return;
			}

			localStorage.setItem(storageKey, taskId);
			pollStatus(taskId);
		} catch (error) {
			console.error(error);
			setHasError(true);
			addSnackbar({
				text: "Erro no upload.",
				type: "error",
				duration: 5000,
			});
			setIsProcessing(false);
		}
	}, [isValidZip, pollStatus, storageKey, uploadFile, addSnackbar]);

	const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsDragging(false);

			const file = event.dataTransfer.files?.[0];
			if (!file) {
				return;
			}

			setUploadFile(file);
			void validateZipFile(file);
		},
		[validateZipFile],
	);

	return {
		uploadFile,
		hasError,
		isValidZip,
		isDragging,
		isValidating,
		isProcessing,
		progress,
		statusMessage,
		resetState,
		clearFileSelection,
		handleFileSelect,
		handleUpload,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	};
}
