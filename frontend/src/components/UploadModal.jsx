import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import JSZip from "jszip";

import {uploadTextArchive, getTaskStatus} from './api/APIFunctions.jsx'

function UploadModal({ isOpen, onClose }) {
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadError, setUploadError] = useState("");
    const [isValidZip, setIsValidZip] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");

    const pollingInterval = useRef(null);

    const resetState = () => {
        setUploadFile(null);
        setUploadError("");
        setIsValidZip(false);
        setIsDragging(false);
        setIsProcessing(false);
        setProgress(0);
        setStatusMessage("");
        if (pollingInterval.current) clearInterval(pollingInterval.current);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const validateZipFile = async (file) => {
        setIsValidating(true);
        setUploadError("");
        setIsValidZip(false);

        // IMPORTANT: This validation is NOT a security measure. 
        // Server-side validation is still required.
        try {
            if (!file.name.toLowerCase().endsWith(".zip")) {
                setUploadError("O arquivo deve ser um ZIP.");
                setIsValidating(false);
                return;
            }

            const zip = new JSZip();
            const zipContents = await zip.loadAsync(file);
            const files = Object.keys(zipContents.files);
            const fileEntries = files.filter(
                (name) => !zipContents.files[name].dir
            );

            if (fileEntries.length === 0) {
                setUploadError("O arquivo ZIP está vazio.");
                setIsValidating(false);
                return;
            }

            const allTxtFiles = fileEntries.every((name) => {
                const fileName = name.split("/").pop();
                return fileName.toLowerCase().endsWith(".txt");
            });

            if (!allTxtFiles) {
                setUploadError("O ZIP deve conter apenas arquivos .txt");
                setIsValidating(false);
                return;
            }

            setIsValidZip(true);
            setUploadError("");
        } catch (error) {
            setUploadError("Erro ao processar o arquivo ZIP.");
            console.error("ZIP validation error:", error);
        } finally {
            setIsValidating(false);
        }
    };

    const pollStatus = async (taskId) => {
        pollingInterval.current = setInterval(async () => {
            try {
                const data = await getTaskStatus(taskId);

                if (data.state === 'PROGRESS') {
                    const percent = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
                    setProgress(percent);
                    setStatusMessage(data.status || `Processando ${percent}%...`);
                } 
                else if (data.state === 'SUCCESS') {
                    clearInterval(pollingInterval.current);
                    setIsProcessing(false);
                    setProgress(100);
                    setStatusMessage("Concluído com sucesso!");
                    
                    setTimeout(() => {
                        alert("Textos processados e salvos!");
                        handleClose();
                    }, 500);
                } 
                else if (data.state === 'FAILURE') {
                    clearInterval(pollingInterval.current);
                    setIsProcessing(false);
                    setUploadError(`Server error:: ${data.error || 'Unexpected Error'}`);
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 2000); 
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy"; 
        setIsDragging(true);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        // Ensures compatibility with many browsers
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            setUploadFile(file);
            validateZipFile(file);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadFile(file);
            validateZipFile(file);
        }
    };

    const handleConfirm = async () => {
        if (!isValidZip || !uploadFile) return;

        setIsProcessing(true);
        setUploadError("");
        setStatusMessage("Iniciando upload...");

        try {
            const response = await uploadTextArchive(uploadFile);
            
            if (response.error) {
                setUploadError(response.error);
                setIsProcessing(false);
                return;
            }

            // Inicia o monitoramento
            setStatusMessage("Aguardando worker...");
            pollStatus(response.task_id);

        } catch (error) {
            console.error("Erro no upload:", error);
            setUploadError("Falha ao enviar arquivo.");
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, []);

    if (!isOpen) return null;

    return (
        <>
            {/* Can't close if it's processing */}
            <div 
                className="modal-overlay" 
                onClick={isProcessing ? undefined : handleClose}
            ></div>
            
            <div className="upload-modal">
                <div className="modal-header">
                    <h2 className="modal-title">Upload de Arquivo</h2>
                    {/* No close button during processing */}
                    {!isProcessing && (
                        <button
                            className="modal-close-button"
                            onClick={handleClose}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="modal-body">
                    {/* Exhibition during upload (not processing yet) */}
                    {!isProcessing ? (
                        <div
                            className={`upload-dropzone ${
                                isDragging ? "dragging" : ""
                            } ${uploadFile ? "has-file" : ""}`}
                            onDragEnter={handleDragEnter} // important to avoid stuttering
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("file-input").click()}
                        >
                            <input
                                id="file-input"
                                type="file"
                                accept=".zip"
                                onChange={handleFileSelect}
                                style={{ display: "none" }}
                            />

                            {isValidating ? (
                                <div className="upload-status">
                                    <div className="upload-spinner"></div>
                                    <p className="upload-text">Validando arquivo...</p>
                                </div>
                            ) : uploadFile ? (
                                <div className="upload-status">
                                    <div className={`upload-icon ${isValidZip ? "valid" : "invalid"}`}>
                                        {isValidZip ? "✓" : "✗"}
                                    </div>
                                    <p className="upload-filename">{uploadFile.name}</p>
                                    {isValidZip && (
                                        <p className="upload-success">Arquivo válido!</p>
                                    )}
                                </div>
                            ) : (
                                <div className="upload-prompt">
                                    <svg
                                        className="upload-icon-svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                    >
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
                        /* Progress bar */
                        <div className="progress-container" style={{ padding: '20px', textAlign: 'center' }}>
                            <div className="progress-bar-wrapper" style={{ 
                                width: '100%', 
                                backgroundColor: '#eee', 
                                borderRadius: '4px', 
                                height: '20px', 
                                overflow: 'hidden',
                                marginBottom: '15px'
                            }}>
                                <div className="progress-bar-fill" style={{ 
                                    width: `${progress}%`, 
                                    backgroundColor: '#4caf50', 
                                    height: '100%', 
                                    transition: 'width 0.3s ease' 
                                }}></div>
                            </div>
                            <p className="upload-text" style={{ fontWeight: 'bold' }}>{statusMessage}</p>
                            <p className="upload-subtext">Não feche esta janela.</p>
                        </div>
                    )}

                    {/* Error exhibition */}
                    {uploadError && (
                        <div className="upload-error">{uploadError}</div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="modal-button cancel-button"
                        onClick={handleClose}
                        disabled={isProcessing} // No cancel button during processing
                        style={isProcessing ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                        Cancelar
                    </button>
                    
                    {/* Confirm button appears only if not processing */}
                    {!isProcessing && (
                        <button
                            className={`modal-button confirm-button ${isValidZip ? "valid" : ""}`}
                            onClick={handleConfirm}
                            disabled={!isValidZip}
                        >
                            Confirmar
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

UploadModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default UploadModal;
