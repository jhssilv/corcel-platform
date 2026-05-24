import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import {
	getActiveTextUploadBatches,
	getTaskStatus,
	getTextUploadBatch,
	uploadTextArchive,
} from "../../Api/UploadApi";
import {
	Badge,
	Icon,
	Stack,
	Button,
	ProgressInline,
	DropZone,
	ModalScaffold,
	Banner,
	IconButton,
	ListSurface,
	ListSurfaceItem,
	ListSurfaceText,
} from "../Generic";
import { useAuth } from "../../Context/Auth/UseAuth";
import { useSnackbar } from "../../Context/Generic";
import type {
	BatchStatusItem,
	TextUploadBatchDetail,
	TextUploadBatchStatus,
	TextUploadTaskResult,
} from "../../types";

interface UploadModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface UploadErrorShape {
	error?: string;
	message?: string;
	name?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const TEXT_UPLOAD_TASK_STORAGE_KEY = "currentTextUploadTaskId";
const TEXT_UPLOAD_BATCH_STORAGE_KEY = "currentTextUploadBatchId";
const TRACKED_TEXTS_STORAGE_KEY = "uploadTrackingTexts";
const TRACKING_ENABLED_STORAGE_KEY = "isTrackingUpload";

const TERMINAL_BATCH_STATUSES = new Set<TextUploadBatchStatus>([
	"COMPLETED",
	"COMPLETED_WITH_ERRORS",
	"FAILED",
]);

const isTerminalBatchStatus = (status: TextUploadBatchStatus): boolean =>
	TERMINAL_BATCH_STATUSES.has(status);

const isCanceledUpload = (error: unknown): boolean => {
	if (error instanceof Error) {
		return error.name === "CanceledError" || error.message === "canceled";
	}

	if (typeof error === "object" && error !== null) {
		const maybeError = error as UploadErrorShape;
		return (
			maybeError.name === "CanceledError" || maybeError.message === "canceled"
		);
	}

	return false;
};

const renderTrackingBadge = (status: BatchStatusItem["processing_status"]) => {
	if (status === "PENDING") {
		return (
			<Badge text="Na fila" iconName="Clock" variant="secondary" size="sm" />
		);
	}

	if (status === "PROCESSING") {
		return (
			<Badge
				text="Processando"
				iconName="Settings"
				variant="primary"
				size="sm"
			/>
		);
	}

	if (status === "READY") {
		return (
			<Badge
				text="Finalizado"
				iconName="CheckCircle2"
				variant="accent"
				size="sm"
			/>
		);
	}

	return <Badge text="Falha" iconName="XCircle" variant="danger" size="sm" />;
};

const isTextUploadTaskResult = (
	result: unknown,
): result is TextUploadTaskResult => {
	if (!result || typeof result !== "object") {
		return false;
	}

	const maybeResult = result as Partial<TextUploadTaskResult>;
	return (
		maybeResult.kind === "text_upload" &&
		typeof maybeResult.batch_id === "number" &&
		Array.isArray(maybeResult.text_ids) &&
		typeof maybeResult.created === "number" &&
		Array.isArray(maybeResult.failed_files)
	);
};

function UploadModal({ isOpen, onClose }: UploadModalProps) {
	const { isAdmin, isAuthLoading } = useAuth();
	const [stagedFiles, setStagedFiles] = useState<File[]>([]);
	const [ignoredFiles, setIgnoredFiles] = useState<string[]>([]);
	const [trackedTexts, setTrackedTexts] = useState<BatchStatusItem[]>(() => {
		try {
			const saved = localStorage.getItem(TRACKED_TEXTS_STORAGE_KEY);
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	});
	const [failedFiles, setFailedFiles] = useState<string[]>([]);
	const [currentBatch, setCurrentBatch] = useState<TextUploadBatchDetail | null>(null);
	const [currentBatchId, setCurrentBatchId] = useState<number | null>(() => {
		const raw = localStorage.getItem(TEXT_UPLOAD_BATCH_STORAGE_KEY);
		if (!raw) {
			return null;
		}

		const parsed = Number(raw);
		return Number.isFinite(parsed) ? parsed : null;
	});
	const [isValidating, setIsValidating] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isTracking, setIsTracking] = useState<boolean>(() => {
		return localStorage.getItem(TRACKING_ENABLED_STORAGE_KEY) === "true";
	});
	const [progress, setProgress] = useState(0);
	const [statusMessage, setStatusMessage] = useState("");
	const [uploadSuccess, setUploadSuccess] = useState(false);

	const { addSnackbar } = useSnackbar();
	const abortControllerRef = useRef<AbortController | null>(null);
	const taskPollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
	const batchPollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

	const trackingTotal = currentBatch?.created_texts ?? trackedTexts.length;
	const trackingCompleted =
		(currentBatch?.processed_texts ?? 0) + (currentBatch?.failed_texts ?? 0);
	const trackingPercent =
		trackingTotal > 0
			? Math.round((trackingCompleted / trackingTotal) * 100)
			: 0;
	const trackingStatusMessage =
		currentBatch?.status_message ||
		(trackingTotal > 0
			? `Processando textos ${trackingCompleted}/${trackingTotal}`
			: "Aguardando status dos textos...");

	const clearTaskPolling = useCallback(() => {
		if (taskPollingInterval.current) {
			clearInterval(taskPollingInterval.current);
			taskPollingInterval.current = null;
		}
	}, []);

	const clearBatchPolling = useCallback(() => {
		if (batchPollingInterval.current) {
			clearInterval(batchPollingInterval.current);
			batchPollingInterval.current = null;
		}
	}, []);

	const clearStoredTracking = useCallback(() => {
		localStorage.removeItem(TEXT_UPLOAD_TASK_STORAGE_KEY);
		localStorage.removeItem(TEXT_UPLOAD_BATCH_STORAGE_KEY);
		localStorage.removeItem(TRACKED_TEXTS_STORAGE_KEY);
		localStorage.removeItem(TRACKING_ENABLED_STORAGE_KEY);
	}, []);

	const applyBatchDetail = useCallback((detail: TextUploadBatchDetail) => {
		setCurrentBatch(detail);
		setCurrentBatchId(detail.id);
		setTrackedTexts(detail.texts);
		setFailedFiles(detail.failed_files);

		const isTerminal = isTerminalBatchStatus(detail.status);
		setIsTracking(!isTerminal);
		setUploadSuccess(isTerminal && detail.created_texts > 0);

		if (detail.status !== "IMPORTING") {
			setIsProcessing(false);
			clearTaskPolling();
			localStorage.removeItem(TEXT_UPLOAD_TASK_STORAGE_KEY);
		}

		if (isTerminal) {
			clearBatchPolling();
		}
	}, [clearBatchPolling, clearTaskPolling]);

	const refreshBatchDetail = useCallback(async (batchId: number) => {
		const detail = await getTextUploadBatch(batchId);
		applyBatchDetail(detail);
		return detail;
	}, [applyBatchDetail]);

	const startBatchTracking = useCallback(async (batchId: number) => {
		localStorage.setItem(TEXT_UPLOAD_BATCH_STORAGE_KEY, String(batchId));
		const detail = await refreshBatchDetail(batchId);

		if (isTerminalBatchStatus(detail.status)) {
			return;
		}

		clearBatchPolling();
		batchPollingInterval.current = setInterval(async () => {
			try {
				const latest = await refreshBatchDetail(batchId);
				if (isTerminalBatchStatus(latest.status)) {
					clearBatchPolling();
				}
			} catch (error) {
				console.error("Batch polling failed:", error);
			}
		}, 3000);
	}, [clearBatchPolling, refreshBatchDetail]);

	const pollTaskStatus = useCallback((taskId: string, batchId: number) => {
		setIsProcessing(true);
		setStatusMessage("Aguardando inicio da importacao...");
		localStorage.setItem(TEXT_UPLOAD_TASK_STORAGE_KEY, taskId);
		localStorage.setItem(TEXT_UPLOAD_BATCH_STORAGE_KEY, String(batchId));

		clearTaskPolling();
		taskPollingInterval.current = setInterval(async () => {
			try {
				const data = await getTaskStatus(taskId);

				if (data.state === "PROGRESS") {
					if (
						typeof data.total === "number" &&
						data.total > 0 &&
						typeof data.current === "number"
					) {
						setProgress(Math.round((data.current / data.total) * 100));
					}
					setStatusMessage(data.status || "Importando arquivos...");
					return;
				}

				if (data.state === "SUCCESS") {
					clearTaskPolling();
					localStorage.removeItem(TEXT_UPLOAD_TASK_STORAGE_KEY);
					setIsProcessing(false);
					setProgress(100);

					if (isTextUploadTaskResult(data.result)) {
						setFailedFiles(data.result.failed_files);
						addSnackbar({
							text: `${data.result.created} arquivo(s) importado(s). O processamento foi iniciado em segundo plano.`,
							type: "success",
						});
						void startBatchTracking(data.result.batch_id);
					} else {
						void startBatchTracking(batchId);
					}
					return;
				}

				if (data.state === "FAILURE") {
					clearTaskPolling();
					localStorage.removeItem(TEXT_UPLOAD_TASK_STORAGE_KEY);
					setIsProcessing(false);
					setFailedFiles(data.failed_files ?? []);
					addSnackbar({
						text: data.error || "Falha no processamento do upload.",
						type: "error",
						duration: 5000,
					});
					void startBatchTracking(batchId);
				}
			} catch (error) {
				console.error("Task polling failed:", error);
				clearTaskPolling();
				setIsProcessing(false);
				void startBatchTracking(batchId);
			}
		}, 2000);
	}, [addSnackbar, clearTaskPolling, startBatchTracking]);

	const resetState = useCallback((clearPersisted: boolean) => {
		setStagedFiles([]);
		setIgnoredFiles([]);
		setFailedFiles([]);
		setCurrentBatch(null);
		setTrackedTexts([]);
		setCurrentBatchId(null);
		setIsProcessing(false);
		setIsTracking(false);
		setProgress(0);
		setStatusMessage("");
		setUploadSuccess(false);

		clearTaskPolling();
		clearBatchPolling();

		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}

		if (clearPersisted) {
			clearStoredTracking();
		}
	}, [clearBatchPolling, clearStoredTracking, clearTaskPolling]);

	useEffect(() => {
		localStorage.setItem(TRACKED_TEXTS_STORAGE_KEY, JSON.stringify(trackedTexts));
	}, [trackedTexts]);

	useEffect(() => {
		localStorage.setItem(TRACKING_ENABLED_STORAGE_KEY, String(isTracking));
	}, [isTracking]);

	useEffect(() => {
		if (currentBatchId !== null) {
			localStorage.setItem(TEXT_UPLOAD_BATCH_STORAGE_KEY, String(currentBatchId));
		}
	}, [currentBatchId]);

	useEffect(() => {
		return () => {
			clearTaskPolling();
			clearBatchPolling();
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, [clearBatchPolling, clearTaskPolling]);

	useEffect(() => {
		const savedBatchIdRaw = localStorage.getItem(TEXT_UPLOAD_BATCH_STORAGE_KEY);
		const savedTaskId = localStorage.getItem(TEXT_UPLOAD_TASK_STORAGE_KEY);
		const hasStoredTrackingState =
			Boolean(savedBatchIdRaw) ||
			Boolean(savedTaskId) ||
			localStorage.getItem(TRACKING_ENABLED_STORAGE_KEY) === "true";

		if (isAuthLoading) {
			return;
		}

		if (!isAdmin) {
			if (hasStoredTrackingState) {
				clearStoredTracking();
				setCurrentBatch(null);
				setCurrentBatchId(null);
				setTrackedTexts([]);
				setFailedFiles([]);
				setIsTracking(false);
			}
			return;
		}

		if (!isOpen && !hasStoredTrackingState) {
			return;
		}

		let canceled = false;

		const restore = async () => {
			const savedBatchId = savedBatchIdRaw ? Number(savedBatchIdRaw) : null;

			if (savedBatchId && Number.isFinite(savedBatchId)) {
				try {
					const detail = await refreshBatchDetail(savedBatchId);
					if (canceled) {
						return;
					}

					if (detail.status === "IMPORTING" && savedTaskId) {
						pollTaskStatus(savedTaskId, savedBatchId);
					} else if (!isTerminalBatchStatus(detail.status)) {
						void startBatchTracking(savedBatchId);
					} else {
						clearStoredTracking();
					}
					return;
				} catch (error) {
					console.error("Failed to resume stored text upload batch:", error);
				}
			}

			try {
				const active = await getActiveTextUploadBatches();
				if (canceled) {
					return;
				}

				const resumableBatch = active.batches.find(
					(batch) => !isTerminalBatchStatus(batch.status),
				);

				if (resumableBatch) {
					void startBatchTracking(resumableBatch.id);
				}
			} catch (error) {
				console.error("Failed to restore active text upload batches:", error);
			}
		};

		void restore();

		return () => {
			canceled = true;
		};
	}, [
		clearStoredTracking,
		isAdmin,
		isAuthLoading,
		isOpen,
		pollTaskStatus,
		refreshBatchDetail,
		startBatchTracking,
	]);

	const handleClose = useCallback(() => {
		if (!isProcessing && !isTracking) {
			resetState(true);
		}
		onClose();
	}, [isProcessing, isTracking, onClose, resetState]);

	const processFiles = async (files: FileList | File[]) => {
		setIsValidating(true);
		setUploadSuccess(false);
		setFailedFiles([]);

		const newStaged: File[] = [];
		const newIgnored: string[] = [];

		try {
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const loweredName = file.name.toLowerCase();

				if (loweredName.endsWith(".zip")) {
					const zip = new JSZip();
					const zipContents = await zip.loadAsync(file);

					for (const [name, zipObj] of Object.entries(zipContents.files)) {
						if (zipObj.dir) {
							continue;
						}

						const fileName = name.split("/").pop() ?? "";
						const loweredFileName = fileName.toLowerCase();

						if (
							!fileName ||
							fileName.startsWith(".") ||
							fileName.startsWith("__")
						) {
							continue;
						}

						if (
							loweredFileName.endsWith(".txt") ||
							loweredFileName.endsWith(".docx")
						) {
							const blob = await zipObj.async("blob");
							if (blob.size > MAX_FILE_SIZE) {
								newIgnored.push(`${fileName} (Excede 50MB)`);
							} else {
								newStaged.push(
									new File([blob], fileName, {
										type: loweredFileName.endsWith(".txt")
											? "text/plain"
											: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
									}),
								);
							}
						} else {
							newIgnored.push(`${fileName} (Formato invalido)`);
						}
					}
				} else if (
					loweredName.endsWith(".txt") ||
					loweredName.endsWith(".docx")
				) {
					if (file.size > MAX_FILE_SIZE) {
						newIgnored.push(`${file.name} (Excede 50MB)`);
					} else {
						newStaged.push(file);
					}
				} else {
					newIgnored.push(`${file.name} (Formato invalido)`);
				}
			}

			setStagedFiles((prev) => {
				const combined = [...prev, ...newStaged];
				return Array.from(new Map(combined.map((file) => [file.name, file])).values());
			});
			setIgnoredFiles((prev) => [...prev, ...newIgnored]);
		} catch (error) {
			addSnackbar({
				text: "Erro ao ler arquivos. Verifique se o ZIP nao esta corrompido.",
				type: "error",
			});
			console.error("File validation error:", error);
		} finally {
			setIsValidating(false);
		}
	};

	const removeStagedFile = (nameToRemove: string) => {
		setStagedFiles((prev) => prev.filter((file) => file.name !== nameToRemove));
	};

	const handleCancelRequest = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
			return;
		}

		setIsProcessing(false);
		setStatusMessage("Upload cancelado.");
		addSnackbar({ text: "Operacao cancelada pelo usuario.", type: "info" });
	};

	const handleConfirm = async () => {
		if (stagedFiles.length === 0) {
			return;
		}

		setIsProcessing(true);
		setStatusMessage("Compactando arquivos para envio...");
		setProgress(0);

		try {
			const zip = new JSZip();
			stagedFiles.forEach((file) => {
				zip.file(file.name, file);
			});

			const zipBlob = await zip.generateAsync({ type: "blob" });
			const uploadFile = new File([zipBlob], "upload_batch.zip", {
				type: "application/zip",
			});

			setStatusMessage("Enviando para o servidor...");
			const controller = new AbortController();
			abortControllerRef.current = controller;

			const response = await uploadTextArchive(uploadFile, controller.signal);

			abortControllerRef.current = null;
			setCurrentBatchId(response.batch_id);
			setCurrentBatch(null);
			setFailedFiles([]);
			setTrackedTexts([]);
			setIsTracking(false);
			setStatusMessage("Upload enviado. Aguardando importacao...");
			pollTaskStatus(response.task_id, response.batch_id);
		} catch (error: unknown) {
			console.error("Upload error:", error);
			if (!isCanceledUpload(error)) {
				addSnackbar({
					text: "Falha ao enviar arquivos.",
					type: "error",
					duration: 5000,
				});
			}
			setIsProcessing(false);
		}
	};

	if (!isOpen && !isProcessing) {
		return null;
	}

	return (
		<ModalScaffold
			isOpen={isOpen || isProcessing}
			onClose={handleClose}
			title="Upload de Textos"
			icon="Upload"
			footer={
				<>
					{isProcessing && progress < 100 ? (
						<Button
							tier="secondary"
							variant="danger"
							onClick={handleCancelRequest}
						>
							Cancelar Envio
						</Button>
					) : (
						<Button
							tier="secondary"
							variant={uploadSuccess ? "neutral" : "danger"}
							onClick={handleClose}
						>
							{uploadSuccess ? "Fechar" : "Cancelar"}
						</Button>
					)}

					{!isProcessing && !isTracking && !uploadSuccess && (
						<Button
							tier="primary"
							variant="action"
							onClick={handleConfirm}
							disabled={stagedFiles.length === 0}
						>
							Enviar
						</Button>
					)}
				</>
			}
		>
			<Stack direction="vertical" gap={12}>
				{failedFiles.length > 0 && !isProcessing && (
					<Banner variant="danger">
						<p>
							<strong>Os seguintes arquivos falharam:</strong>
						</p>
						<ul>
							{failedFiles.map((fileName, index) => (
								<li key={index}>{fileName}</li>
							))}
						</ul>
					</Banner>
				)}

				{(isTracking || uploadSuccess || currentBatch !== null) && (
					<Stack direction="vertical" gap={12}>
						<h3>Status de Processamento</h3>
						{trackingTotal > 0 && (
							<ProgressInline
								progress={trackingPercent}
								statusMessage={trackingStatusMessage}
								hintText="Os textos seguem sendo processados em segundo plano."
								showPercent={false}
							/>
						)}
						<ListSurface>
							{trackedTexts.map((textItem) => (
								<ListSurfaceItem key={textItem.id}>
									<Stack alignX="space-between" alignY="center">
										<ListSurfaceText title={textItem.source_file_name ?? `Texto #${textItem.id}`}>
											{textItem.source_file_name ?? `Texto #${textItem.id}`}
										</ListSurfaceText>
										{renderTrackingBadge(textItem.processing_status)}
									</Stack>
								</ListSurfaceItem>
							))}
						</ListSurface>
						<p>
							A avaliacao e executada em segundo plano. Voce pode fechar esta
							janela e retomar o acompanhamento depois, mesmo apos reiniciar o
							navegador.
						</p>
					</Stack>
				)}

				{!isProcessing && !isTracking && !uploadSuccess && currentBatch === null && (
					<>
						<DropZone
							variant="panel"
							accept=".zip,.txt,.docx"
							multiple
							onFilesDropped={(files) => {
								void processFiles(files);
							}}
						>
							{() => {
								return isValidating ? (
									<ProgressInline
										progress={0}
										statusMessage="Verificando arquivos..."
										showPercent={false}
										mode="spinner"
									/>
								) : (
									<Stack direction="vertical" alignX="center" gap={12}>
										<Icon name="Upload" color="current" size={64} />
										<p>Arraste arquivos TXT, DOCX ou ZIPs</p>
										<p>ou clique para selecionar (Max 50MB por arquivo)</p>
									</Stack>
								);
							}}
						</DropZone>

						{stagedFiles.length > 0 && (
							<div>
								<h4>Arquivos Validos ({stagedFiles.length})</h4>
								<ListSurface>
									{stagedFiles.map((file, index) => (
										<ListSurfaceItem key={index}>
											<Stack alignX="space-between" alignY="center">
												<ListSurfaceText title={file.name}>
													{file.name}
												</ListSurfaceText>
												<IconButton
													icon="X"
													label="Remover"
													size="sm"
													variant="danger"
													onClick={(event) => {
														event.stopPropagation();
														removeStagedFile(file.name);
													}}
												/>
											</Stack>
										</ListSurfaceItem>
									))}
								</ListSurface>
							</div>
						)}

						{ignoredFiles.length > 0 && (
							<div>
								<h4>Arquivos Ignorados ({ignoredFiles.length})</h4>
								<ListSurface>
									{ignoredFiles.map((message, index) => (
										<ListSurfaceItem key={index}>
											<ListSurfaceText tone="danger" truncate={false}>
												{message}
											</ListSurfaceText>
										</ListSurfaceItem>
									))}
								</ListSurface>
							</div>
						)}
					</>
				)}

				{isProcessing && (
					<ProgressInline
						progress={progress}
						statusMessage={statusMessage}
						hintText="Voce pode fechar esta janela. A importacao continuara em segundo plano."
						showPercent={false}
					/>
				)}
			</Stack>
		</ModalScaffold>
	);
}

export default UploadModal;
