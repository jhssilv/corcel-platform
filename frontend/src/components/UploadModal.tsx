import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from 'react';
import JSZip from 'jszip';
import { getTaskStatus, uploadTextArchive } from './api/APIFunctions';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadErrorShape {
  error?: string;
  message?: string;
}

function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isValidZip, setIsValidZip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [failedFiles, setFailedFiles] = useState<string[]>([]);

  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetState = useCallback(() => {
    setUploadFile(null);
    setUploadError('');
    setIsValidZip(false);
    setIsDragging(false);
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('');
    setFailedFiles([]);

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
            setStatusMessage(data.status || `Processando ${percent}%...(${data.current}/${data.total})`);
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

          if (failedList.length > 0) {
            setStatusMessage(`Concluído com ${failedList.length} arquivo(s) com falha.`);
          } else {
            setStatusMessage('Concluído com sucesso!');
          }

          setTimeout(() => {
            if (failedList.length > 0) {
              alert(`Textos processados! ${failedList.length} arquivo(s) falharam:\n${failedList.join('\n')}`);
            } else {
              alert('Textos processados e salvos!');
            }
            handleClose();
          }, 500);
        } else if (data.state === 'FAILURE') {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }

          localStorage.removeItem('currentTaskId');
          setIsProcessing(false);
          setUploadError(`Server error: ${data.error || 'Unexpected Error'}`);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  }, [handleClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const savedTaskId = localStorage.getItem('currentTaskId');
    if (savedTaskId && !pollingInterval.current) {
      setIsProcessing(true);
      void pollStatus(savedTaskId);
    } else if (!savedTaskId) {
      resetState();
    }
  }, [isOpen, pollStatus, resetState]);

  const validateZipFile = async (file: File) => {
    setIsValidating(true);
    setUploadError('');
    setIsValidZip(false);

    try {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setUploadError('O arquivo deve ser um ZIP.');
        setIsValidating(false);
        return;
      }

      const zip = new JSZip();
      const zipContents = await zip.loadAsync(file);
      const files = Object.keys(zipContents.files);
      const fileEntries = files.filter((name) => !zipContents.files[name].dir);

      if (fileEntries.length === 0) {
        setUploadError('O arquivo ZIP está vazio.');
        setIsValidating(false);
        return;
      }

      const allValidFiles = fileEntries.every((name) => {
        const fileName = name.split('/').pop() ?? '';
        const lowered = fileName.toLowerCase();
        return lowered.endsWith('.txt') || lowered.endsWith('.docx');
      });

      if (!allValidFiles) {
        setUploadError('O ZIP deve conter apenas arquivos .txt ou .docx');
        setIsValidating(false);
        return;
      }

      setIsValidZip(true);
      setUploadError('');
    } catch (error) {
      setUploadError('Erro ao processar o arquivo ZIP.');
      console.error('ZIP validation error:', error);
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
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadFile(file);
      void validateZipFile(file);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      void validateZipFile(file);
    }
  };

  const handleConfirm = async () => {
    if (!isValidZip || !uploadFile) {
      return;
    }

    setIsProcessing(true);
    setUploadError('');
    setStatusMessage('Iniciando upload...');

    try {
      const response = await uploadTextArchive(uploadFile);
      localStorage.setItem('currentTaskId', response.task_id);
      setStatusMessage('Aguardando servidor...');
      void pollStatus(response.task_id);
    } catch (error) {
      console.error('Erro no upload:', error);
      const typedError = error as UploadErrorShape;
      setUploadError(typedError.error || typedError.message || 'Falha ao enviar arquivo.');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  if (!isOpen && !isProcessing) {
    return null;
  }

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div style={{ display: isOpen ? 'block' : 'none' }}>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="upload-modal" onClick={handleOverlayClick}>
          <div className="modal-header">
            <h2 className="modal-title">Upload de Arquivo</h2>
            <button className="modal-close-button" onClick={handleClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="modal-body">
            {!isProcessing ? (
              <div
                className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${uploadFile ? 'has-file' : ''}`}
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
                  accept=".zip"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                {isValidating ? (
                  <div className="upload-status">
                    <div className="upload-spinner"></div>
                    <p className="upload-text">Validando arquivo...</p>
                  </div>
                ) : uploadFile ? (
                  <div className="upload-status">
                    <div className={`upload-icon ${isValidZip ? 'valid' : 'invalid'}`}>
                      {isValidZip ? '✓' : '✗'}
                    </div>
                    <p className="upload-filename">{uploadFile.name}</p>
                    {isValidZip && <p className="upload-success">Arquivo válido!</p>}
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <svg className="upload-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="upload-text">Arraste um arquivo ZIP aqui</p>
                    <p className="upload-subtext">ou clique para selecionar</p>
                  </div>
                )}
              </div>
            ) : (
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
                <p className="upload-text" style={{ fontWeight: 'bold' }}>{statusMessage}</p>
                <p className="upload-subtext">Você pode fechar esta janela, o processo continuará em segundo plano.</p>
              </div>
            )}

            {uploadError && <div className="upload-error">{uploadError}</div>}

            {failedFiles.length > 0 && (
              <div className="upload-error" style={{ marginTop: '10px' }}>
                Arquivos com falha: {failedFiles.join(', ')}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="modal-button cancel-button" onClick={handleClose}>
              {isProcessing ? 'Fechar' : 'Cancelar'}
            </button>

            {!isProcessing && (
              <button
                className={`modal-button confirm-button ${isValidZip ? 'valid' : ''}`}
                onClick={handleConfirm}
                disabled={!isValidZip}
              >
                Confirmar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadModal;
