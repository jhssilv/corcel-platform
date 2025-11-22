"use client"

import { useContext, useState } from "react"
import PropTypes from "prop-types"
import "../styles/top_bar.css"
import AuthContext from "./auth_context.jsx"
import downloadIcon from "../assets/download.svg"
import uploadIcon from "../assets/upload.svg"
import logoutIcon from "../assets/logout.svg"
import whitelistIcon from "../assets/whitelist.svg"
import reportIcon from "../assets/report.svg"
import JSZip from "jszip"

import { requestReport } from "./api/api_functions.jsx"

function TopBar({ onDownloadClick }) {
  const { logout, username } = useContext(AuthContext)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isWhitelistOpen, setIsWhitelistOpen] = useState(false)
  const [whitelistText, setWhitelistText] = useState("")
  const [originalWhitelistText, setOriginalWhitelistText] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadError, setUploadError] = useState("")
  const [isValidZip, setIsValidZip] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const [isReportOpen, setIsReportOpen] = useState(false)
  const [textCount, setTextCount] = useState(0)

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen)
  }

  const closePanel = () => {
    setIsPanelOpen(false)
  }

  const handleUploadClick = () => {
    setIsUploadOpen(true)
    closePanel()
    // Reset upload state
    setUploadFile(null)
    setUploadError("")
    setIsValidZip(false)
  }

  const handleReportClick = () => {
    const textIds = JSON.parse(localStorage.getItem("textIds") || "[]")
    setTextCount(textIds.length)
    setIsReportOpen(true)
    closePanel()
  }

  const handleLogoutClick = () => {
    console.log("[TODO] Implement logout functionality here")
    // Uncomment the line below when ready to implement:
    // logout();
  }

  const handleWhitelistClick = () => {
    setIsWhitelistOpen(true)
    closePanel()
    fetchWhitelist()
  }

  const fetchWhitelist = async () => {
    try {
      const placeholderWords = "word1, word2, word3, example, test"
      setWhitelistText(placeholderWords)
      setOriginalWhitelistText(placeholderWords)
    } catch (error) {
      console.error("[TODO] Handle API fetch error:", error)
    }
  }

  const handleWhitelistUpdate = async () => {
    setIsUpdating(true)
    try {
      console.log("[TODO] Send whitelist update to API:", whitelistText)
      await new Promise((resolve) => setTimeout(resolve, 500))
      setOriginalWhitelistText(whitelistText)
      setIsWhitelistOpen(false)
    } catch (error) {
      console.error("[TODO] Handle API update error:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleWhitelistCancel = () => {
    setWhitelistText(originalWhitelistText)
    setIsWhitelistOpen(false)
  }

  const hasTextChanged = whitelistText !== originalWhitelistText

  const validateZipFile = async (file) => {
    setIsValidating(true)
    setUploadError("")
    setIsValidZip(false)

    try {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setUploadError("O arquivo deve ser um ZIP.")
        setIsValidating(false)
        return
      }

      const zip = new JSZip()
      const zipContents = await zip.loadAsync(file)

      const files = Object.keys(zipContents.files)
      const fileEntries = files.filter((name) => !zipContents.files[name].dir)

      if (fileEntries.length === 0) {
        setUploadError("O arquivo ZIP está vazio.")
        setIsValidating(false)
        return
      }

      const allTxtFiles = fileEntries.every((name) => {
        const fileName = name.split("/").pop()
        return fileName.toLowerCase().endsWith(".txt")
      })

      if (!allTxtFiles) {
        setUploadError("O ZIP deve conter apenas arquivos .txt")
        setIsValidating(false)
        return
      }

      setIsValidZip(true)
      setUploadError("")
    } catch (error) {
      setUploadError("Erro ao processar o arquivo ZIP.")
      console.error("ZIP validation error:", error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      setUploadFile(file)
      validateZipFile(file)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadFile(file)
      validateZipFile(file)
    }
  }

  const handleUploadConfirm = async () => {
    if (!isValidZip || !uploadFile) return

    try {
      console.log("[TODO] Upload file to API:", uploadFile.name)
      setIsUploadOpen(false)
      setUploadFile(null)
      setUploadError("")
      setIsValidZip(false)
    } catch (error) {
      console.error("[TODO] Handle upload error:", error)
      setUploadError("Erro ao fazer upload do arquivo.")
    }
  }

  const handleUploadCancel = () => {
    setIsUploadOpen(false)
    setUploadFile(null)
    setUploadError("")
    setIsValidZip(false)
    setIsDragging(false)
  }

  const handleReportConfirm = async () => {
    try {
      const textIds = JSON.parse(localStorage.getItem("textIds") || "[]")
      setIsReportOpen(false)
      await requestReport(JSON.parse(localStorage.getItem("userId")), textIds)
    } catch (error) {
      console.error("[TODO] Handle report generation error:", error)
    }
  }

  const handleReportCancel = () => {
    setIsReportOpen(false)
  }

  return (
    <>
      <div className="top-bar">
        <button className="hamburger-button" onClick={togglePanel} aria-label="Menu">
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
        </button>

        <div className="app-title-container">
          <h1 className="app-title">CorCel</h1>
          <p className="app-subtitle">Ferramenta de Normalização Ortográfica</p>
        </div>

        <div className="top-bar-spacer"></div>
      </div>

      {isPanelOpen && <div className="panel-overlay" onClick={closePanel}></div>}

      <div className={`side-panel ${isPanelOpen ? "open" : ""}`}>
        <div className="panel-header">
          <span className="username-display">Olá, {username}</span>
          <button className="close-button" onClick={closePanel} aria-label="Close menu">
            ×
          </button>
        </div>

        <div className="panel-content">
          <div className="panel-main-section">
            <button className="panel-button download-button" onClick={onDownloadClick}>
              <img src={downloadIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Download</span>
            </button>

            <button className="panel-button upload-button" onClick={handleUploadClick}>
              <img src={uploadIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Upload</span>
            </button>

            <button className="panel-button whitelist-button" onClick={handleWhitelistClick}>
              <img src={whitelistIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Whitelist</span>
            </button>

            <button className="panel-button report-button" onClick={handleReportClick}>
              <img src={reportIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Gerar Relatório</span>
            </button>
          </div>

          <div className="panel-logout-section">
            <button className="panel-button logout-button" onClick={handleLogoutClick}>
              <img src={logoutIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {isWhitelistOpen && (
        <>
          <div className="modal-overlay" onClick={handleWhitelistCancel}></div>
          <div className="whitelist-modal">
            <div className="modal-header">
              <h2 className="modal-title">Gerenciar Whitelist</h2>
              <button className="modal-close-button" onClick={handleWhitelistCancel} aria-label="Close">
                ×
              </button>
            </div>

            <div className="modal-body">
              <label htmlFor="whitelist-textarea" className="textarea-label">
                Lista de palavras (separadas por vírgula):
              </label>
              <textarea
                id="whitelist-textarea"
                className="whitelist-textarea"
                value={whitelistText}
                onChange={(e) => setWhitelistText(e.target.value)}
                placeholder="Digite as palavras separadas por vírgula..."
                rows={15}
              />
            </div>

            <div className="modal-footer">
              <button className="modal-button cancel-button" onClick={handleWhitelistCancel} disabled={isUpdating}>
                Cancelar
              </button>
              <button
                className="modal-button update-button"
                onClick={handleWhitelistUpdate}
                disabled={!hasTextChanged || isUpdating}
              >
                {isUpdating ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
          </div>
        </>
      )}

      {isUploadOpen && (
        <>
          <div className="modal-overlay" onClick={handleUploadCancel}></div>
          <div className="upload-modal">
            <div className="modal-header">
              <h2 className="modal-title">Upload de Arquivo</h2>
              <button className="modal-close-button" onClick={handleUploadCancel} aria-label="Close">
                ×
              </button>
            </div>

            <div className="modal-body">
              <div
                className={`upload-dropzone ${isDragging ? "dragging" : ""} ${uploadFile ? "has-file" : ""}`}
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
                    <div className={`upload-icon ${isValidZip ? "valid" : "invalid"}`}>{isValidZip ? "✓" : "✗"}</div>
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

              {uploadError && <div className="upload-error">{uploadError}</div>}
            </div>

            <div className="modal-footer">
              <button className="modal-button cancel-button" onClick={handleUploadCancel}>
                Cancelar
              </button>
              <button
                className={`modal-button confirm-button ${isValidZip ? "valid" : ""}`}
                onClick={handleUploadConfirm}
                disabled={!isValidZip}
              >
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}

      {isReportOpen && (
        <>
          <div className="modal-overlay" onClick={handleReportCancel}></div>
          <div className="report-modal">
            <div className="modal-header">
              <h2 className="modal-title">Gerar Relatório</h2>
              <button className="modal-close-button" onClick={handleReportCancel} aria-label="Close">
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="report-text">Gerar relatório para os {textCount} textos filtrados?</p>
            </div>

            <div className="modal-footer">
              <button className="modal-button cancel-button" onClick={handleReportCancel}>
                Cancelar
              </button>
              <button className="modal-button confirm-button report-confirm" onClick={handleReportConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

TopBar.propTypes = {
  onDownloadClick: PropTypes.func.isRequired,
}

export default TopBar
