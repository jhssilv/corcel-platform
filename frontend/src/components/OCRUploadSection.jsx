import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import JSZip from "jszip";
import '../styles/ocr_upload_modal.css';
import { uploadOCRArchive, getTaskStatus } from './api/APIFunctions.jsx';

function OCRUploadSection({ onUploadComplete }) {
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isValidZip, setIsValidZip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const pollingInterval = useRef(null);

  useEffect(() => {
    const savedOCRTaskId = localStorage.getItem("currentOCRTaskId");
    if (savedOCRTaskId && !isProcessing && !pollingInterval.current) {
      setIsProcessing(true);
      pollStatus(savedOCRTaskId);
    }
  }, []);

  const validateZipFile = async (file) => {
    setIsValidating(true);
    setUploadError("");
    setIsValidZip(false);

    try {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setUploadError("O arquivo deve ser um ZIP.");
        setIsValidating(false);
        return;
      }

      const zip = new JSZip();
      const zipContents = await zip.loadAsync(file);
      const files = Object.keys(zipContents.files);
      const fileEntries = files.filter((name) => !zipContents.files[name].dir);

      if (fileEntries.length === 0) {
        setUploadError("O arquivo ZIP está vazio.");
        setIsValidating(false);
        return;
      }

      const validExtensions = ['.png', '.jpg', '.jpeg', '.tif', '.tiff'];
      const allImages = fileEntries.every(name => {
        if (name.startsWith('__MACOSX') || name.startsWith('.')) return true;
        const lower = name.toLowerCase();
        return validExtensions.some(ext => lower.endsWith(ext));
      });

      if (!allImages) {
        setUploadError("O ZIP deve conter apenas imagens (png, jpg, tif, tiff).");
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
    setStatusMessage("Aguardando início do processamento...");
    
    pollingInterval.current = setInterval(async () => {
      try {
        const data = await getTaskStatus(taskId);

        if (data.state === 'PROGRESS') {
          if (data.total > 0) {
            const percent = Math.round((data.current / data.total) * 100);
            setProgress(percent);
          }
          setStatusMessage(data.status || "Processando imagens...");
        } else if (data.state === 'SUCCESS') {
          clearInterval(pollingInterval.current);
          setIsProcessing(false);
          setProgress(100);
          setStatusMessage("Processamento concluído!");
          localStorage.removeItem("currentOCRTaskId");
          
          if (onUploadComplete) onUploadComplete();
          
          setTimeout(() => {
            setUploadFile(null);
            setIsValidZip(false);
            setProgress(0);
            setStatusMessage("");
          }, 2000);
        } else if (data.state === 'FAILURE') {
          clearInterval(pollingInterval.current);
          setIsProcessing(false);
          setUploadError("Falha no processamento: " + (data.error || "Erro desconhecido"));
          localStorage.removeItem("currentOCRTaskId");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      validateZipFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !isValidZip) return;

    setIsProcessing(true);
    setUploadError("");
    setStatusMessage("Enviando arquivo...");

    try {
      const response = await uploadOCRArchive(uploadFile);
      const taskId = response.task_id;
      
      if (taskId) {
        localStorage.setItem("currentOCRTaskId", taskId);
        pollStatus(taskId);
      } else {
        setUploadError("O servidor não retornou um ID de tarefa.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      setUploadError(error.message || "Erro no upload.");
      setIsProcessing(false);
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

  return (
    <div className="ocr-upload-section">
      <h3 className="ocr-upload-title">Upload de Imagens para OCR</h3>
      {!isProcessing ? (
        <>
          <div
            className={`drop-zone ${isDragging ? "dragging" : ""} ${
              uploadFile ? "has-file" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!uploadFile ? (
              <>
                <svg className="upload-icon-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="upload-text-container">
                  <p className="upload-main-text">
                    {isDragging ? "Solte o arquivo aqui" : "Arraste e solte seu arquivo ZIP aqui"}
                  </p>
                  <p className="upload-or-text">ou</p>
                  <label className="file-input-label">
                    <span className="file-input-button">Escolher arquivo</span>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileSelect}
                      className="file-input"
                    />
                  </label>
                  <p className="upload-hint-text">Apenas arquivos .zip contendo imagens (PNG, JPG, TIF)</p>
                </div>
              </>
            ) : (
              <div className="file-info-container">
                <svg className="file-icon-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div className="file-details">
                  <span className="file-name">{uploadFile.name}</span>
                  <span className="file-size">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="file-status">
                  {isValidating && <span className="validating">Validando...</span>}
                  {!isValidating && isValidZip && <span className="valid-mark">✓ Válido</span>}
                  {!isValidating && !isValidZip && uploadError && <span className="invalid-mark">✗ Inválido</span>}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button 
                    className="remove-file-btn"
                    onClick={() => {
                      setUploadFile(null);
                      setIsValidZip(false);
                      setUploadError("");
                    }}
                  >
                    ✕ Remover
                  </button>
                  <button
                    className={`confirm-button ${isValidZip && !isValidating ? 'enabled' : ''}`}
                    onClick={handleUpload}
                    disabled={!isValidZip || isValidating}
                  >
                    Fazer Upload
                  </button>
                </div>
              </div>
            )}
          </div>
          {uploadError && <div className="error-message">{uploadError}</div>}
        </>
      ) : (
        <div className="processing-container">
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{progress}%</p>
          <p className="status-message">{statusMessage}</p>
          <div className="processing-spinner"></div>
        </div>
      )}
    </div>
  );
}

OCRUploadSection.propTypes = {
  onUploadComplete: PropTypes.func,
};

export default OCRUploadSection;
