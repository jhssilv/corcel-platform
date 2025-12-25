import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import { parseTextFile } from "./functions/FileParsers"

import { getWhitelist, addToWhitelist, removeFromWhitelist } from "./api/APIFunctions"

function WhitelistModal({ isOpen, onClose }) {
  const [whitelistText, setWhitelistText] = useState("")
  const [originalWhitelistText, setOriginalWhitelistText] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchWhitelist()
    }
  }, [isOpen])

  const fetchWhitelist = async () => {
    try {
      const whitelistedWords = await getWhitelist();
      console.log(whitelistedWords);
      setWhitelistText(whitelistedWords.tokens.join(", "))
      setOriginalWhitelistText(whitelistedWords.tokens.join(", "))
    } catch (error) {
      console.error("[TODO] Handle API fetch error:", error)
    }
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {

      const originalWords = originalWhitelistText.split(",").map(word => word.trim()).filter(word => word.length > 0)
      const updatedWords = whitelistText.split(",").map(word => word.trim()).filter(word => word.length > 0)

      const wordsToAdd = updatedWords.filter(word => !originalWords.includes(word))
      const wordsToRemove = originalWords.filter(word => !updatedWords.includes(word))
      
      for (const word of wordsToAdd) {
        await addToWhitelist(word)
      }

      for (const word of wordsToRemove) {
        await removeFromWhitelist(word)
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
      setOriginalWhitelistText(whitelistText)
      onClose()
    } catch (error) {
      console.error("Error updating whitelist:", error)
      alert("Houve um erro ao atualizar a whitelist.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setWhitelistText(originalWhitelistText)
    onClose()
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const textFiles = files.filter((file) => file.type === "text/plain" || file.name.endsWith(".txt"))

    if (textFiles.length === 0) return

    try {
      const allTokens = []
      for (const file of textFiles) {
        const tokens = await parseTextFile(file)
        allTokens.push(...tokens)
      }

      if (allTokens.length > 0) {
        setWhitelistText((prev) => {
          const separator = prev.trim() ? ", " : ""
          return prev + separator + allTokens.join(", ")
        })
      }
    } catch (error) {
      console.error("Error parsing files:", error)
      alert("Erro ao ler arquivos de texto.")
    }
  }

  const hasTextChanged = whitelistText !== originalWhitelistText

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={handleCancel}>
        <div className="whitelist-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Gerenciar Whitelist</h2>
            <button className="modal-close-button" onClick={handleCancel} aria-label="Close">
              ×
            </button>
          </div>

          <div className="modal-body">
            <label htmlFor="whitelist-textarea" className="textarea-label">
              Lista de palavras (separadas por vírgula):
            </label>
            <div 
              className={`textarea-container ${isDragging ? "dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                id="whitelist-textarea"
                className="whitelist-textarea"
                value={whitelistText}
                onChange={(e) => setWhitelistText(e.target.value)}
                placeholder="Digite as palavras separadas por vírgula ou arraste arquivos de texto aqui..."
                rows={15}
              />
              {isDragging && <div className="drag-overlay">Solte os arquivos aqui</div>}
            </div>
          </div>

          <div className="modal-footer">
            <button className="modal-button cancel-button" onClick={handleCancel} disabled={isUpdating}>
              Cancelar
            </button>
            <button
              className="modal-button update-button"
              onClick={handleUpdate}
              disabled={!hasTextChanged || isUpdating}
            >
              {isUpdating ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

WhitelistModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default WhitelistModal