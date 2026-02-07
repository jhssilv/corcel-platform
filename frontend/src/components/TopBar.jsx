"use client"

import { useContext, useState } from "react"
import PropTypes from "prop-types"
import "../styles/top_bar.css"
import AuthContext from "./AuthContext.jsx"

// Sub-components
import SidePanel from "./SidePanel.jsx"
import WhitelistModal from "./WhiteListModal.jsx"
import UploadModal from "./UploadModal.jsx"
import ReportModal from "./ReportModal.jsx"
import RegisterUserModal from "./RegisterUserModal.jsx"
import { useNavigate } from "react-router-dom";

function TopBar({ onDownloadClick , showSidePanel = true}) {
  const { logout, username, isAdmin } = useContext(AuthContext)
  
  // UI State
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isWhitelistOpen, setIsWhitelistOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isRegisterUserOpen, setIsRegisterUserOpen] = useState(false)
  const [reportTextCount, setReportTextCount] = useState(0)
  const navigate = useNavigate();


  // Logic Handlers
  const togglePanel = () => setIsPanelOpen(!isPanelOpen)
  const closePanel = () => setIsPanelOpen(false)

  const openUpload = () => {
    setIsUploadOpen(true)
    closePanel()
  }

  const openWhitelist = () => {
    setIsWhitelistOpen(true)
    closePanel()
  }

  const openReport = () => {
    const textIds = JSON.parse(localStorage.getItem("textIds") || "[]")
    setReportTextCount(textIds.length)
    setIsReportOpen(true)
    closePanel()
  }

  const openRegisterUser = () => {
    setIsRegisterUserOpen(true)
    closePanel()
  }

  const handleManageUsers = () => {
    navigate("/users")
    closePanel()
  }

  const handleOCR = () => {
      navigate("/ocr")
      closePanel()
  }

  const handleAssignments = () => {
      navigate("/assignments")
      closePanel()
  }

  const handleDownload = () => {
    if (onDownloadClick) {
      onDownloadClick()
    }
    closePanel()
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
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
          <h1 className="app-title">CorCel 🐎</h1>
          <p className="app-subtitle">Ferramenta de Normalização Ortográfica</p>
        </div>

        <div className="top-bar-spacer"></div>
      </div>

      {showSidePanel ?
        <SidePanel 
          isOpen={isPanelOpen}
          onClose={closePanel}
          username={username}
          isAdmin={isAdmin}
          onDownload={handleDownload}
          onUpload={openUpload}
          onWhitelist={openWhitelist}
          onReport={openReport}
          onRegisterUser={openRegisterUser}
          onManageUsers={handleManageUsers}
          onOCR={handleOCR}
          onAssignments={handleAssignments}
          onLogout={handleLogout}
        /> : null}

      <WhitelistModal 
        isOpen={isWhitelistOpen} 
        onClose={() => setIsWhitelistOpen(false)} 
      />

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
      />

      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)}
        textCount={reportTextCount}
      />

      <RegisterUserModal
        isOpen={isRegisterUserOpen}
        onClose={() => setIsRegisterUserOpen(false)}
      />
    </>
  )
}

TopBar.propTypes = {
  onDownloadClick: PropTypes.func,
  showSidePanel: PropTypes.bool
}

export default TopBar