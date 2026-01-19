import PropTypes from "prop-types"
import { useEffect, useState } from "react"
import { requestReport } from "./api/APIFunctions.jsx"

function ReportModal({ isOpen, onClose, textCount }) {
  const [confirmEnabled, setConfirmEnabled] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setConfirmEnabled(false)
      return
    }

    setConfirmEnabled(false)
    const timer = setTimeout(() => setConfirmEnabled(true), 2000)
    return () => clearTimeout(timer)
  }, [isOpen])

  const handleConfirm = async () => {
    try {
      const textIds = JSON.parse(localStorage.getItem("textIds") || "[]")
      onClose()
      await requestReport(textIds)
    } catch (error) {
      alert(error.error || "Houve um erro ao gerar o relatório.")
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="report-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Gerar Relatório</h2>
            <button className="modal-close-button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="modal-body">
            <p className="report-text">Gerar relatório para os <b>{textCount}</b> textos <b>filtrados</b>?</p>
          </div>

          <div className="modal-footer">
            <button className="modal-button cancel-button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="modal-button confirm-button report-confirm"
              onClick={handleConfirm}
              disabled={!confirmEnabled}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

ReportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  textCount: PropTypes.number.isRequired,
}

export default ReportModal