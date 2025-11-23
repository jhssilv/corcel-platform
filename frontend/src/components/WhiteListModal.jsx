import { useState, useEffect } from "react"
import PropTypes from "prop-types"

function WhitelistModal({ isOpen, onClose }) {
  const [whitelistText, setWhitelistText] = useState("")
  const [originalWhitelistText, setOriginalWhitelistText] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchWhitelist()
    }
  }, [isOpen])

  const fetchWhitelist = async () => {
    try {
      const placeholderWords = "word1, word2, word3, example, test"
      setWhitelistText(placeholderWords)
      setOriginalWhitelistText(placeholderWords)
    } catch (error) {
      console.error("[TODO] Handle API fetch error:", error)
    }
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      console.log("[TODO] Send whitelist update to API:", whitelistText)
      alert("Essa funcionalidade de whitelist ainda não foi implementada.")
      await new Promise((resolve) => setTimeout(resolve, 500))
      setOriginalWhitelistText(whitelistText)
      onClose()
    } catch (error) {
      console.error("[TODO] Handle API update error:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setWhitelistText(originalWhitelistText)
    onClose()
  }

  const hasTextChanged = whitelistText !== originalWhitelistText

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={handleCancel}></div>
      <div className="whitelist-modal">
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
    </>
  )
}

WhitelistModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default WhitelistModal