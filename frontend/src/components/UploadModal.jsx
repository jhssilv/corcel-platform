import { useState } from "react";
import PropTypes from "prop-types";
import JSZip from "jszip";

function UploadModal({ isOpen, onClose }) {
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadError, setUploadError] = useState("");
    const [isValidZip, setIsValidZip] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    const resetState = () => {
        setUploadFile(null);
        setUploadError("");
        setIsValidZip(false);
        setIsDragging(false);
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

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
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

        try {
            console.log("[TODO] Upload file to API:", uploadFile.name);
            alert("Essa funcionalidade de upload ainda não foi implementada.");
            handleClose();
        } catch (error) {
            console.error("[TODO] Handle upload error:", error);
            setUploadError("Erro ao fazer upload do arquivo.");
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay" onClick={handleClose}></div>
            <div className="upload-modal">
                <div className="modal-header">
                    <h2 className="modal-title">Upload de Arquivo</h2>
                    <button
                        className="modal-close-button"
                        onClick={handleClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div
                        className={`upload-dropzone ${
                            isDragging ? "dragging" : ""
                        } ${uploadFile ? "has-file" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() =>
                            document.getElementById("file-input").click()
                        }
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
                                <p className="upload-text">
                                    Validando arquivo...
                                </p>
                            </div>
                        ) : uploadFile ? (
                            <div className="upload-status">
                                <div
                                    className={`upload-icon ${
                                        isValidZip ? "valid" : "invalid"
                                    }`}
                                >
                                    {isValidZip ? "✓" : "✗"}
                                </div>
                                <p className="upload-filename">
                                    {uploadFile.name}
                                </p>
                                {isValidZip && (
                                    <p className="upload-success">
                                        Arquivo válido!
                                    </p>
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
                                <p className="upload-text">
                                    Arraste um arquivo ZIP aqui
                                </p>
                                <p className="upload-subtext">
                                    ou clique para selecionar
                                </p>
                            </div>
                        )}
                    </div>

                    {uploadError && (
                        <div className="upload-error">{uploadError}</div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="modal-button cancel-button"
                        onClick={handleClose}
                    >
                        Cancelar
                    </button>
                    <button
                        className={`modal-button confirm-button ${
                            isValidZip ? "valid" : ""
                        }`}
                        onClick={handleConfirm}
                        disabled={!isValidZip}
                    >
                        Confirmar
                    </button>
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
