import PropTypes from "prop-types"
import downloadIcon from "../assets/download.svg"
import uploadIcon from "../assets/upload.svg"
import logoutIcon from "../assets/logout.svg"
import whitelistIcon from "../assets/whitelist.svg"
import reportIcon from "../assets/report.svg"
import registerIcon from "../assets/register.svg" // Assuming you might have an icon, or reuse one

function SidePanel({ 
  isOpen, 
  onClose, 
  username, 
  isAdmin,
  onDownload, 
  onUpload, 
  onWhitelist, 
  onReport, 
  onRegisterUser,
  onManageUsers,
  onOCR,
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

            <button className="panel-button whitelist-button" onClick={onWhitelist}>
              <img src={whitelistIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Whitelist</span>
            </button>

            <button className="panel-button report-button" onClick={onReport}>
              <img src={reportIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
              <span className="button-text">Gerar Relatório</span>
            </button>
            
            {isAdmin && (
              <>
                <button className="panel-button register-button" onClick={onRegisterUser}>
                  <img src={registerIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
                  <span className="button-text">Registrar Usuário</span>
                </button>
                <button className="panel-button manage-users-button" onClick={onManageUsers}>
                  <img src={registerIcon || "/placeholder.svg"} alt="" className="button-icon-svg" />
                  <span className="button-text">Gerenciar Usuários</span>
                </button>
              </>
            )}          </div>

          <div className="panel-ocr-section">
            <button className="panel-button ocr-button" onClick={onOCR}>
              <span style={{fontSize: '1.2rem', marginRight: '0.5rem'}}>📷</span>
              <span className="button-text">Módulo OCR</span>
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
  onOCR: PropTypes.func,
  onDownload: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onWhitelist: PropTypes.func.isRequired,
  onReport: PropTypes.func.isRequired,
  onRegisterUser: PropTypes.func,
  onManageUsers: PropTypes.func,
  onLogout: PropTypes.func.isRequired,
}

export default SidePanel