import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from 'react';
import JSZip from 'jszip';
import { getTaskStatus, uploadTextArchive } from '../../Api';
import styles from '../../styles/upload_modal.module.css';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UploadErrorShape {
    error?: string;
    message?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function UploadModal({ isOpen, onClose }: UploadModalProps) {
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [ignoredFiles, setIgnoredFiles] = useState<string[]>([]);
    const [uploadError, setUploadError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [failedFiles, setFailedFiles] = useState<string[]>([]);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const resetState = useCallback(() => {
        setStagedFiles([]);
        setIgnoredFiles([]);
        setUploadError('');
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

        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    }, []);

    const handleClose = useCallback(() => {
        if (!isProcessing) {
            resetState();
        }
        onClose();
    }, [isProcessing, onClose, resetState]);

    const pollStatus = useCallback(async (taskId: string) => {
        pollingInterval.current = setInterval(async () => {
            try {
                const data = await getTaskStatus(taskId);

                if (data.state === 'PROGRESS') {
                    if (typeof data.total === 'number' && data.total > 0 && typeof data.current === 'number') {
                        const percent = Math.round((data.current / data.total) * 100);
                        setProgress(percent);
                        setStatusMessage(data.status || `Processando ${percent}%... (${data.current}/${data.total})`);
                    } else {
                        setStatusMessage(data.status || 'Processando...');
                    }
                } else if (data.state === 'SUCCESS') {
                    if (pollingInterval.current) {
                        clearInterval(pollingInterval.current);
                        pollingInterval.current = null;
                    }

                    localStorage.removeItem('currentTaskId');
                    setIsProcessing(false);
                    setProgress(100);

                    const failedList = data.failed_files || [];
                    setFailedFiles(failedList);
                    setUploadSuccess(true);
                    setStagedFiles([]);
                    setIgnoredFiles([]);

                    if (failedList.length > 0) {
                         setStatusMessage(`Concluído com ${failedList.length} arquivo(s) com falha.`);
                    } else {
                         setStatusMessage('Processamento concluído com sucesso!');
                    }
                } else if (data.state === 'FAILURE') {
                    if (pollingInterval.current) {
                        clearInterval(pollingInterval.current);
                        pollingInterval.current = null;
                    }

                    localStorage.removeItem('currentTaskId');
                    setIsProcessing(false);
                    setUploadError(`Erro do Servidor: ${data.error || 'Erro inesperado'}`);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 2000);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const savedTaskId = localStorage.getItem('currentTaskId');
        if (savedTaskId && !pollingInterval.current) {
            setIsProcessing(true);
            void pollStatus(savedTaskId);
        } else if (!savedTaskId && !isProcessing && !uploadSuccess) {
            resetState();
        }
    }, [isOpen, pollStatus, resetState, isProcessing, uploadSuccess]);

    useEffect(() => {
        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    const processFiles = async (files: FileList | File[]) => {
        setIsValidating(true);
        setUploadError('');
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
            setUploadError('Erro ao ler arquivos. Verifique se o ZIP não está corrompido.');
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
        setUploadError('Operação cancelada pelo usuário.');
    };

    const handleConfirm = async () => {
        if (stagedFiles.length === 0) return;

        setIsProcessing(true);
        setUploadError('');
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
            localStorage.setItem('currentTaskId', response.task_id);
            setStatusMessage('Aguardando processamento...');
            void pollStatus(response.task_id);
        } catch (error: any) {
            console.error('Erro no upload:', error);
            if (error.name === 'CanceledError' || error.message === 'canceled') {
                // Handled in handleCancelRequest
            } else {
                const typedError = error as UploadErrorShape;
                setUploadError(typedError.error || typedError.message || 'Falha ao enviar arquivos.');
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
        <div style={{ display: isOpen ? 'block' : 'none' }}>
            <div className={styles['modal-overlay']} onClick={handleClose}>
                <div className={styles['upload-modal']} onClick={handleOverlayClick}>
                    <div className={styles['modal-header']}>
                        <h2 className={styles['modal-title']}>Upload de Textos</h2>
                        <button className={styles['modal-close-button']} onClick={handleClose} aria-label="Close">
                            ×
                        </button>
                    </div>

                    <div className={styles['modal-body']}>
                        {uploadSuccess && (
                            <div className={`${styles['status-banner']} ${styles['status-success']}`}>
                                {statusMessage}
                            </div>
                        )}
                        
                        {failedFiles.length > 0 && !isProcessing && (
                            <div className={`${styles['status-banner']} ${styles['status-error']}`}>
                                <p><strong>Os seguintes arquivos falharam:</strong></p>
                                <ul style={{ textAlign: 'left', marginTop: '10px', fontSize: '0.9rem' }}>
                                    {failedFiles.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                            </div>
                        )}

                        {!isProcessing && !uploadSuccess && (
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
                                        <div className={styles['upload-status']}>
                                            <div className={styles['upload-spinner']}></div>
                                            <p className={styles['upload-text']}>Verificando arquivos...</p>
                                        </div>
                                    ) : (
                                        <div className={styles['upload-prompt']}>
                                            <svg className={styles['upload-icon-svg']} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className={styles['upload-text']}>Arraste arquivos TXT, DOCX ou ZIPs</p>
                                            <p className={styles['upload-subtext']}>ou clique para selecionar (Máx 50MB por arquivo)</p>
                                        </div>
                                    )}
                                </div>
                                
                                {stagedFiles.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '10px 0 5px 0', fontSize: '0.95rem' }}>Arquivos Válidos ({stagedFiles.length})</h4>
                                        <div className={styles['staged-files-list']}>
                                            {stagedFiles.map((file, idx) => (
                                                <div key={idx} className={styles['staged-file-item']}>
                                                    <span className={styles.fileName} title={file.name}>{file.name}</span>
                                                    <button 
                                                        className={styles['remove-file-button']} 
                                                        onClick={(e) => { e.stopPropagation(); removeStagedFile(file.name); }}
                                                        title="Remover"
                                                    >×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {ignoredFiles.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '10px 0 5px 0', fontSize: '0.95rem', color: 'var(--color-danger)' }}>Arquivos Ignorados ({ignoredFiles.length})</h4>
                                        <div className={styles['ignored-files-list']}>
                                            {ignoredFiles.map((err, idx) => (
                                                <div key={idx} className={styles['ignored-file-item']}>
                                                    <span className={styles.fileName}>{err}</span>
                                                </div>
                                            ))}
                                        </div>
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

                        {uploadError && <div className={styles['upload-error']}>{uploadError}</div>}
                    </div>

                    <div className={styles['modal-footer']}>
                        {isProcessing && progress < 100 ? (
                            <button className={[styles['modal-button'], styles['cancel-button']].join(' ')} onClick={handleCancelRequest}>
                                Cancelar Envio
                            </button>
                        ) : (
                            <button className={[styles['modal-button'], styles['cancel-button']].join(' ')} onClick={handleClose}>
                                {uploadSuccess ? 'Fechar' : 'Cancelar'}
                            </button>
                        )}

                        {!isProcessing && !uploadSuccess && (
                            <button
                                className={[
                                    styles['modal-button'],
                                    styles['confirm-button'],
                                    stagedFiles.length > 0 ? styles.valid : '',
                                ].filter(Boolean).join(' ')}
                                onClick={handleConfirm}
                                disabled={stagedFiles.length === 0}
                            >
                                Enviar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UploadModal;
