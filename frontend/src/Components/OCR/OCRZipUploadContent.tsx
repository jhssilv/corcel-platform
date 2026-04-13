import {
	type ChangeEvent,
	type DragEvent,
	type MouseEvent as ReactMouseEvent,
} from "react";
import { Banner, Button, Icon, Stack } from "../Generic";
import styles from "./ocr_upload_shared.module.css";

interface OCRZipUploadContentProps {
	uploadFile: File | null;
	hasError: boolean;
	isValidZip: boolean;
	isDragging: boolean;
	isValidating: boolean;
	onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
	onDragOver: (event: DragEvent<HTMLDivElement>) => void;
	onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
	onDrop: (event: DragEvent<HTMLDivElement>) => void;
	onClear: () => void;
	onUpload?: () => void;
	showUploadButton?: boolean;
}

export function OCRZipUploadContent({
	uploadFile,
	hasError,
	isValidZip,
	isDragging,
	isValidating,
	onFileSelect,
	onDragOver,
	onDragLeave,
	onDrop,
	onClear,
	onUpload,
	showUploadButton = false,
}: OCRZipUploadContentProps) {
	const dropZoneClasses = [
		styles.dropZone,
		isDragging ? styles.dropZoneDragging : "",
		uploadFile ? styles.dropZoneHasFile : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<>
			<Stack
				direction="vertical"
				alignX="center"
				alignY="center"
				gap={16}
				className={dropZoneClasses}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				{!uploadFile ? (
					<>
						<Icon name="Upload" color="current" className={styles.uploadIcon} />
						<Stack direction="vertical" alignX="center" gap={12}>
							<p className={styles.uploadMainText}>
								{isDragging
									? "Solte o arquivo aqui"
									: "Arraste e solte seu arquivo ZIP aqui"}
							</p>
							<p className={styles.uploadOrText}>ou</p>
							<label className={styles.fileInputLabel}>
								<span className={styles.fileInputButton}>Escolher arquivo</span>
								<input
									type="file"
									accept=".zip"
									onChange={onFileSelect}
									className={styles.fileInput}
								/>
							</label>
							<p className={styles.uploadHintText}>
								Apenas arquivos .zip contendo imagens (PNG, JPG, TIF)
							</p>
						</Stack>
					</>
				) : (
					<Stack
						direction="vertical"
						alignX="center"
						gap={16}
						className={styles.fileInfoContainer}
					>
						<Icon name="FileText" color="current" className={styles.fileIcon} />
						<Stack direction="vertical" alignX="center" gap={4}>
							<span className={styles.fileName}>{uploadFile.name}</span>
							<span className={styles.fileSize}>
								{(uploadFile.size / 1024 / 1024).toFixed(2)} MB
							</span>
						</Stack>
						<div className={styles.fileStatus}>
							{isValidating && (
								<span className={styles.validating}>Validando...</span>
							)}
							{!isValidating && isValidZip && (
								<span className={styles.validMark}>Valido</span>
							)}
							{!isValidating && !isValidZip && hasError && (
								<span className={styles.invalidMark}>Invalido</span>
							)}
						</div>
						<Button
							type="button"
							tier="secondary"
							variant="danger"
							size="sm"
							className={styles.removeFileButton}
							onClick={(event: ReactMouseEvent<HTMLElement>) => {
								event.stopPropagation();
								onClear();
							}}
						>
							Remover
						</Button>
						{showUploadButton && onUpload ? (
							<Button
								type="button"
								tier="primary"
								variant="action"
								onClick={onUpload}
								disabled={!isValidZip || isValidating}
							>
								Fazer Upload
							</Button>
						) : null}
					</Stack>
				)}
			</Stack>

			{hasError ? (
				<Banner variant="danger" className={styles.errorMessage}>
					Erro durante upload, confira se o arquivo e valido.
				</Banner>
			) : null}
		</>
	);
}

export default OCRZipUploadContent;
