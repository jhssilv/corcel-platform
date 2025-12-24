import PropTypes from "prop-types"
import { requestReport } from "./api/APIFunctions.jsx"

function ReportModal({ isOpen, onClose, textCount }) {
  const handleConfirm = async () => {
    try {
      const textIds = JSON.parse(localStorage.getItem("textIds") || "[]")
      onClose()
      await requestReport(JSON.parse(localStorage.getItem("userId")), textIds)
    } catch (error) {
      alert(error.error || "Houve um erro ao gerar o relatório.")
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="report-modal">
        <div className="modal-header">
          <h2 className="modal-title">Gerar Relatório</h2>
          <button className="modal-close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="report-text">Gerar relatório para os {textCount} textos filtrados?</p>
        </div>

        <div className="modal-footer">
          <button className="modal-button cancel-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="modal-button confirm-button report-confirm" onClick={handleConfirm}>
            Confirmar
          </button>
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