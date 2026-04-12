import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from 'react';
import JSZip from 'jszip';
import { uploadTextArchive, getBatchStatus } from '../../Api/UploadApi';
import { Badge, Icon, Dialog, DialogHeader, Stack, Button } from '../Generic';
import { useSnackbar } from '../../Context/Generic';
import styles from '../../styles/upload_modal.module.css';
import type { BatchStatusItem } from '../../types/api/responses';

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
        return error.name === 'CanceledError' || error.message === 'canceled';
    }

    if (typeof error === 'object' && error !== null) {
        const maybeError = error as UploadErrorShape;
        return maybeError.name === 'CanceledError' || maybeError.message === 'canceled';
    }

    return false;
};

const renderTrackingBadge = (status: BatchStatusItem['processing_status']) => {
    if (status === 'PENDING') {
        return <Badge text="Na fila" iconName="Clock" variant="secondary" size="sm" />;
    }

    if (status === 'PROCESSING') {
        return <Badge text="Processando" iconName="Settings" variant="primary" size="sm" />;
    }

    if (status === 'READY') {
        return <Badge text="Finalizado" iconName="CheckCircle2" variant="accent" size="sm" />;
    }

    if (status === 'FAILED') {
        return (
            <Badge
                text="Falha"
                iconName="XCircle"
                variant="secondary"
                size="sm"
                style={{
                    backgroundColor: 'var(--color-danger)',
                    borderColor: 'var(--color-danger-hover)',
                }}
            />
        );
    }

    return <Badge text={status} variant="secondary" size="sm" iconPosition="none" />;
};

function UploadModal({ isOpen, onClose }: UploadModalProps) {
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [ignoredFiles, setIgnoredFiles] = useState<string[]>([]);
    const { addSnackbar } = useSnackbar();
    const [isDragging, setIsDragging] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [failedFiles, setFailedFiles] = useState<string[]>([]);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Tracking States
    const [trackedTexts, setTrackedTexts] = useState<BatchStatusItem[]>(() => {
        try {
            const saved = localStorage.getItem('uploadTrackingTexts');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isTracking, setIsTracking] = useState<boolean>(() => {
        return localStorage.getItem('isTrackingUpload') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('uploadTrackingTexts', JSON.stringify(trackedTexts));
    }, [trackedTexts]);

    const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const resetState = useCallback(() => {
        setStagedFiles([]);
        setIgnoredFiles([]);
        setIsDragging(false);
        setIsProcessing(false);
        setProgress(0);
        setStatusMessage('');
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
        localStorage.setItem('isTrackingUpload', String(isTracking));
        if (isTracking && trackedTexts.length > 0 && !pollingInterval.current) {
            const anyInProgress = trackedTexts.some(t => t.processing_status === 'PENDING' || t.processing_status === 'PROCESSING');
            if (anyInProgress) {
                const ids = trackedTexts.map(t => t.id);
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
                    const allDone = latest.statuses.every((s) => s.processing_status === 'READY' || s.processing_status === 'FAILED');
                    if (allDone && pollingInterval.current) {
                        clearInterval(pollingInterval.current);
                        setIsTracking(false);
                    }
                } catch (e) {
                    console.error('Polling tick failed:', e);
                }
            }, 3000);
        } catch (e) {
            console.error('Initial batch status failed:', e);
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

                if (loweredName.endsWith('.zip')) {
                    const zip = new JSZip();
                    const zipContents = await zip.loadAsync(file);

                    for (const [name, zipObj] of Object.entries(zipContents.files)) {
                        if (zipObj.dir) continue;

                        const fileName = name.split('/').pop() ?? '';
                        const loweredFileName = fileName.toLowerCase();

                        // Ignore system/hidden files silently
                        if (!fileName || fileName.startsWith('.') || fileName.startsWith('__')) {
                            continue;
                        }

                        if (loweredFileName.endsWith('.txt') || loweredFileName.endsWith('.docx')) {
                            const blob = await zipObj.async('blob');
                            if (blob.size > MAX_FILE_SIZE) {
                                newIgnored.push(`${fileName} (Excede 50MB)`);
                            } else {
                                // Prevent duplicates by name in the staged files list
                                newStaged.push(new File([blob], fileName, { type: loweredFileName.endsWith('.txt') ? 'text/plain' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
                            }
                        } else {
                            newIgnored.push(`${fileName} (Formato inválido)`);
                        }
                    }
                } else if (loweredName.endsWith('.txt') || loweredName.endsWith('.docx')) {
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
                const unique = Array.from(new Map(combined.map(f => [f.name, f])).values());
                return unique;
            });
            setIgnoredFiles((prev) => [...prev, ...newIgnored]);

        } catch (error) {
            addSnackbar({
                text: 'Erro ao ler arquivos. Verifique se o ZIP não está corrompido.',
                type: 'error',
            });
            console.error('File validation error:', error);
        } finally {
            setIsValidating(false);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragging(true);
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            void processFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            void processFiles(e.target.files);
            e.target.value = ''; // Reset input to allow re-selecting same files
        }
    };

    const removeStagedFile = (nameToRemove: string) => {
        setStagedFiles((prev) => prev.filter(f => f.name !== nameToRemove));
    };

    const handleCancelRequest = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsProcessing(false);
        setStatusMessage('Upload cancelado.');
        addSnackbar({ text: 'Operação cancelada pelo usuário.', type: 'info' });
    };

    const handleConfirm = async () => {
        if (stagedFiles.length === 0) return;

        setIsProcessing(true);
        setStatusMessage('Compactando arquivos para envio...');
        setProgress(0);

        try {
            // Build ZIP blob in memory
            const zip = new JSZip();
            stagedFiles.forEach(file => {
                zip.file(file.name, file);
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const uploadFile = new File([zipBlob], 'upload_batch.zip', { type: 'application/zip' });

            setStatusMessage('Enviando para o servidor...');
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const response = await uploadTextArchive(uploadFile, controller.signal);

            abortControllerRef.current = null; // Clean up

            addSnackbar({ text: `${response.text_ids.length} arquivo(s) enviado(s) para processamento em background.`, type: 'success' });
            setUploadSuccess(true);
            setIsProcessing(false);
            setProgress(100);
            setStatusMessage('Upload concluído com sucesso!');
            setStagedFiles([]);
            setIgnoredFiles([]);
            setFailedFiles([]);

            void pollBatchStatus(response.text_ids);
        } catch (error: unknown) {
            console.error('Erro no upload:', error);
            if (isCanceledUpload(error)) {
                // Handled in handleCancelRequest
            } else {
                console.error(error);
                addSnackbar({ text: 'Falha ao enviar arquivos.', type: 'error', duration: 5000 });
                setIsProcessing(false);
            }
        }
    };

    const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    if (!isOpen && !isProcessing) {
        return null;
    }

    return (
        <Dialog isOpen={isOpen || isProcessing} onClose={handleClose} className={styles['upload-modal']}>
            <DialogHeader onClose={handleClose} icon='Upload'>
                Upload de Textos
            </DialogHeader>

            <Stack direction="vertical" gap={12} className={styles['modal-body']}>
                {failedFiles.length > 0 && !isProcessing && (
                    <div className={`${styles['status-banner']} ${styles['status-error']}`}>
                        <p><strong>Os seguintes arquivos falharam:</strong></p>
                        <ul style={{ textAlign: 'left', marginTop: '10px', fontSize: '0.9rem' }}>
                            {failedFiles.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                )}

                {isTracking || uploadSuccess ? (
                    <div className="tracking-container" style={{ padding: '20px' }}>
                        <h3 style={{ marginBottom: '15px' }}>Status de Processamento</h3>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd', color: '#333' }}>
                                        <th style={{ padding: '10px' }}>Arquivo</th>
                                        <th style={{ padding: '10px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackedTexts.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px 10px', fontSize: '0.9rem' }}>{t.source_file_name}</td>
                                            <td style={{ padding: '8px 10px', fontSize: '0.9rem' }}>
                                                {renderTrackingBadge(t.processing_status)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '15px' }}>
                            A avaliação é executada em segundo plano. Você já pode fechar esta janela caso queira e analisar os textos disponíveis no painel.
                        </p>
                    </div>
                ) : !isProcessing && (
                    <>
                        <div
                            className={[
                                styles['upload-dropzone'],
                                isDragging ? styles.dragging : '',
                            ].filter(Boolean).join(' ')}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => {
                                const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
                                fileInput?.click();
                            }}
                        >
                            <input
                                id="file-input"
                                type="file"
                                multiple
                                accept=".zip,.txt,.docx"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />

                            {isValidating ? (
                                <Stack direction="vertical" alignX="center" gap={16} className={styles['upload-status']}>
                                    <div className={styles['upload-spinner']}></div>
                                    <p className={styles['upload-text']}>Verificando arquivos...</p>
                                </Stack>
                            ) : (
                                <Stack direction="vertical" alignX="center" gap={12} className={styles['upload-prompt']}>
                                    <Icon name="Upload" color="black" className={styles['upload-icon-svg']} style={{ color: 'currentColor' }} />
                                    <p className={styles['upload-text']}>Arraste arquivos TXT, DOCX ou ZIPs</p>
                                    <p className={styles['upload-subtext']}>ou clique para selecionar (Máx 50MB por arquivo)</p>
                                </Stack>
                            )}
                        </div>

                        {stagedFiles.length > 0 && (
                            <div>
                                <h4 style={{ margin: '10px 0 5px 0', fontSize: '0.95rem' }}>Arquivos Válidos ({stagedFiles.length})</h4>
                                <Stack direction="vertical" gap={8} className={styles['staged-files-list']}>
                                    {stagedFiles.map((file, idx) => (
                                        <Stack alignX="space-between" alignY="center" key={idx} className={styles['staged-file-item']}>
                                            <span className={styles.fileName} title={file.name}>{file.name}</span>
                                            <button
                                                className={styles['remove-file-button']}
                                                onClick={(e) => { e.stopPropagation(); removeStagedFile(file.name); }}
                                                title="Remover"
                                            >×</button>
                                        </Stack>
                                    ))}
                                </Stack>
                            </div>
                        )}

                        {ignoredFiles.length > 0 && (
                            <div>
                                <h4 style={{ margin: '10px 0 5px 0', fontSize: '0.95rem', color: 'var(--color-danger)' }}>Arquivos Ignorados ({ignoredFiles.length})</h4>
                                <Stack direction="vertical" gap={8} className={styles['ignored-files-list']}>
                                    {ignoredFiles.map((err, idx) => (
                                        <Stack alignX="space-between" alignY="center" key={idx} className={styles['ignored-file-item']}>
                                            <span className={styles.fileName}>{err}</span>
                                        </Stack>
                                    ))}
                                </Stack>
                            </div>
                        )}
                    </>
                )}

                {isProcessing && (
                    <div className="progress-container" style={{ padding: '20px', textAlign: 'center' }}>
                        <div
                            className="progress-bar-wrapper"
                            style={{
                                width: '100%',
                                backgroundColor: '#eee',
                                borderRadius: '4px',
                                height: '20px',
                                overflow: 'hidden',
                                marginBottom: '15px',
                            }}
                        >
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${progress}%`,
                                    backgroundColor: '#4caf50',
                                    height: '100%',
                                    transition: 'width 0.3s ease',
                                }}
                            ></div>
                        </div>
                        <p className={styles['upload-text']} style={{ fontWeight: 'bold' }}>{statusMessage}</p>
                        {progress < 100 && (
                            <p className={styles['upload-subtext']}>Você pode fechar esta janela, o processo continuará em segundo plano.</p>
                        )}
                    </div>
                )}
            </Stack>
            <Stack alignX="end" alignY="center" gap={16} className={styles['modal-footer']}>
                {isProcessing && progress < 100 ? (
                    <Button tier="secondary" variant="danger" onClick={handleCancelRequest}>
                        Cancelar Envio
                    </Button>
                ) : (
                    <Button tier="secondary" variant={uploadSuccess ? 'neutral' : 'danger'} onClick={handleClose}>
                        {uploadSuccess ? 'Fechar' : 'Cancelar'}
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
            </Stack>
        </Dialog>
    );
}

export default UploadModal;
