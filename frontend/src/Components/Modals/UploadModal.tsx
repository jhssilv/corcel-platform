import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { uploadTextArchive, getBatchStatus } from "../../Api/UploadApi";
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
import { useSnackbar } from "../../Context/Generic";
import type { BatchStatusItem } from "../../types/api/responses";

interface UploadModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface UploadErrorShape {
	error?: string;
	message?: string;
	name?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

	if (status === "FAILED") {
		return <Badge text="Falha" iconName="XCircle" variant="danger" size="sm" />;
	}

	return (
		<Badge text={status} variant="secondary" size="sm" iconPosition="none" />
	);
};

function UploadModal({ isOpen, onClose }: UploadModalProps) {
	const [stagedFiles, setStagedFiles] = useState<File[]>([]);
	const [ignoredFiles, setIgnoredFiles] = useState<string[]>([]);
	const { addSnackbar } = useSnackbar();
	const [isValidating, setIsValidating] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);
	const [statusMessage, setStatusMessage] = useState("");
	const [failedFiles, setFailedFiles] = useState<string[]>([]);
	const [uploadSuccess, setUploadSuccess] = useState(false);

	// Tracking States
	const [trackedTexts, setTrackedTexts] = useState<BatchStatusItem[]>(() => {
		try {
			const saved = localStorage.getItem("uploadTrackingTexts");
			return saved ? JSON.parse(saved) : [];
		} catch {
			return [];
		}
	});
	const [isTracking, setIsTracking] = useState<boolean>(() => {
		return localStorage.getItem("isTrackingUpload") === "true";
	});

	useEffect(() => {
		localStorage.setItem("uploadTrackingTexts", JSON.stringify(trackedTexts));
	}, [trackedTexts]);

	const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const resetState = useCallback(() => {
		setStagedFiles([]);
		setIgnoredFiles([]);
		setIsProcessing(false);
		setProgress(0);
		setStatusMessage("");
		setFailedFiles([]);
		setUploadSuccess(false);

		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	const handleClose = useCallback(() => {
		if (!isProcessing) {
			resetState();
		}
		onClose();
	}, [isProcessing, onClose, resetState]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		if (!isProcessing && !uploadSuccess) {
			resetState();
		}
	}, [isOpen, resetState, isProcessing, uploadSuccess]);

	useEffect(() => {
		return () => {
			if (abortControllerRef.current) abortControllerRef.current.abort();
		};
	}, []);

	useEffect(() => {
		localStorage.setItem("isTrackingUpload", String(isTracking));
		if (isTracking && trackedTexts.length > 0 && !pollingInterval.current) {
			const anyInProgress = trackedTexts.some(
				(t) =>
					t.processing_status === "PENDING" ||
					t.processing_status === "PROCESSING",
			);
			if (anyInProgress) {
				const ids = trackedTexts.map((t) => t.id);
				void pollBatchStatus(ids);
			} else {
				setIsTracking(false);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isTracking]);

	const pollBatchStatus = async (textIds: number[]) => {
		setIsTracking(true);
		let ids = textIds;
		try {
			const initial = await getBatchStatus(ids);
			setTrackedTexts(initial.statuses);

			if (pollingInterval.current) {
				clearInterval(pollingInterval.current);
			}
			pollingInterval.current = setInterval(async () => {
				try {
					const latest = await getBatchStatus(ids);
					setTrackedTexts(latest.statuses);
					const allDone = latest.statuses.every(
						(s) =>
							s.processing_status === "READY" ||
							s.processing_status === "FAILED",
					);
					if (allDone && pollingInterval.current) {
						clearInterval(pollingInterval.current);
						setIsTracking(false);
					}
				} catch (e) {
					console.error("Polling tick failed:", e);
				}
			}, 3000);
		} catch (e) {
			console.error("Initial batch status failed:", e);
			setIsTracking(false);
		}
	};

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
						if (zipObj.dir) continue;

						const fileName = name.split("/").pop() ?? "";
						const loweredFileName = fileName.toLowerCase();

						// Ignore system/hidden files silently
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
								// Prevent duplicates by name in the staged files list
								newStaged.push(
									new File([blob], fileName, {
										type: loweredFileName.endsWith(".txt")
											? "text/plain"
											: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
									}),
								);
							}
						} else {
							newIgnored.push(`${fileName} (Formato inválido)`);
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
					newIgnored.push(`${file.name} (Formato inválido)`);
				}
			}

			setStagedFiles((prev) => {
				// Combine and remove exact name duplicates
				const combined = [...prev, ...newStaged];
				const unique = Array.from(
					new Map(combined.map((f) => [f.name, f])).values(),
				);
				return unique;
			});
			setIgnoredFiles((prev) => [...prev, ...newIgnored]);
		} catch (error) {
			addSnackbar({
				text: "Erro ao ler arquivos. Verifique se o ZIP não está corrompido.",
				type: "error",
			});
			console.error("File validation error:", error);
		} finally {
			setIsValidating(false);
		}
	};

	const removeStagedFile = (nameToRemove: string) => {
		setStagedFiles((prev) => prev.filter((f) => f.name !== nameToRemove));
	};

	const handleCancelRequest = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		setIsProcessing(false);
		setStatusMessage("Upload cancelado.");
		addSnackbar({ text: "Operação cancelada pelo usuário.", type: "info" });
	};

	const handleConfirm = async () => {
		if (stagedFiles.length === 0) return;

		setIsProcessing(true);
		setStatusMessage("Compactando arquivos para envio...");
		setProgress(0);

		try {
			// Build ZIP blob in memory
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

			abortControllerRef.current = null; // Clean up

			addSnackbar({
				text: `${response.text_ids.length} arquivo(s) enviado(s) para processamento em background.`,
				type: "success",
			});
			setUploadSuccess(true);
			setIsProcessing(false);
			setProgress(100);
			setStatusMessage("Upload concluído com sucesso!");
			setStagedFiles([]);
			setIgnoredFiles([]);
			setFailedFiles([]);

			void pollBatchStatus(response.text_ids);
		} catch (error: unknown) {
			console.error("Erro no upload:", error);
			if (isCanceledUpload(error)) {
				// Handled in handleCancelRequest
			} else {
				console.error(error);
				addSnackbar({
					text: "Falha ao enviar arquivos.",
					type: "error",
					duration: 5000,
				});
				setIsProcessing(false);
			}
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

					{!isProcessing && !uploadSuccess && (
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
							{failedFiles.map((f, i) => (
								<li key={i}>{f}</li>
							))}
						</ul>
					</Banner>
				)}

				{isTracking || uploadSuccess ? (
					<Stack direction="vertical" gap={12}>
						<h3>Status de Processamento</h3>
						<ListSurface>
							{trackedTexts.map((textItem) => (
								<ListSurfaceItem key={textItem.id}>
									<Stack alignX="space-between" alignY="center">
										<ListSurfaceText title={textItem.source_file_name}>
											{textItem.source_file_name}
										</ListSurfaceText>
										{renderTrackingBadge(textItem.processing_status)}
									</Stack>
								</ListSurfaceItem>
							))}
						</ListSurface>
						<p>
							A avaliação é executada em segundo plano. Você já pode fechar esta
							janela caso queira e analisar os textos disponíveis no painel.
						</p>
					</Stack>
				) : (
					!isProcessing && (
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
											<p>ou clique para selecionar (Máx 50MB por arquivo)</p>
										</Stack>
									);
								}}
							</DropZone>

							{stagedFiles.length > 0 && (
								<div>
									<h4>Arquivos Válidos ({stagedFiles.length})</h4>
									<ListSurface>
										{stagedFiles.map((file, idx) => (
											<ListSurfaceItem key={idx}>
												<Stack alignX="space-between" alignY="center">
													<ListSurfaceText title={file.name}>
														{file.name}
													</ListSurfaceText>
													<IconButton
														icon="X"
														label="Remover"
														size="sm"
														variant="danger"
														onClick={(e) => {
															e.stopPropagation();
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
										{ignoredFiles.map((err, idx) => (
											<ListSurfaceItem key={idx}>
												<Stack alignX="space-between" alignY="center">
													<ListSurfaceText tone="danger" truncate={false}>
														{err}
													</ListSurfaceText>
												</Stack>
											</ListSurfaceItem>
										))}
									</ListSurface>
								</div>
							)}
						</>
					)
				)}

				{isProcessing && (
					<ProgressInline
						progress={progress}
						statusMessage={statusMessage}
						hintText={
							progress < 100
								? "Você pode fechar esta janela, o processo continuará em segundo plano."
								: undefined
						}
						showPercent={false}
					/>
				)}
			</Stack>
		</ModalScaffold>
	);
}

export default UploadModal;
