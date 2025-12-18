import PropTypes from "prop-types"
import downloadIcon from "../assets/download.svg"
import uploadIcon from "../assets/upload.svg"
import logoutIcon from "../assets/logout.svg"
import whitelistIcon from "../assets/whitelist.svg"
import reportIcon from "../assets/report.svg"

function SidePanel({ 
  isOpen, 
  onClose, 
  username, 
  onDownload, 
  onUpload, 
  onWhitelist, 
  onReport, 
  onLogout 
}) {
  return (
    <>
      {isOpen && <div className="panel-overlay" onClick={onClose}></div>}

      <div className={`side-panel ${isOpen ? "open" : ""}`}>
        <div className="panel-header">
          <span className="username-display">Olá, {username}.</span>
          <button className="close-button" onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </div>

        <div className="panel-content">
          <div className="panel-main-section">
            <button className="panel-button download-button" onClick={onDownload}>
              <img src={downloadIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Download</span>
            </button>

            <button className="panel-button upload-button" onClick={onUpload}>
              <img src={uploadIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Upload</span>
            </button>

            <button className="panel-button whitelist-button" onClick={onWhitelist} disabled>
              <img src={whitelistIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Whitelist</span>
            </button>

            <button className="panel-button report-button" onClick={onReport}>
              <img src={reportIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Gerar Relatório</span>
            </button>
          </div>

          <div className="panel-logout-section">
            <button className="panel-button logout-button" onClick={onLogout}>
              <img src={logoutIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

SidePanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  username: PropTypes.string,
  onDownload: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onWhitelist: PropTypes.func.isRequired,
  onReport: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
}

export default SidePanel