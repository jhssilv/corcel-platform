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
import { useNavigate } from "react-router-dom";

function TopBar({ onDownloadClick }) {
  const { logout, username } = useContext(AuthContext)
  
  // UI State
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isWhitelistOpen, setIsWhitelistOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
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

  const handleLogout = () => {
    console.log("[TODO] Implement logout functionality here")
    localStorage.clear();
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
          <h1 className="app-title">CorCel</h1>
          <p className="app-subtitle">Ferramenta de Normalização Ortográfica</p>
        </div>

        <div className="top-bar-spacer"></div>
      </div>

      <SidePanel 
        isOpen={isPanelOpen}
        onClose={closePanel}
        username={username}
        onDownload={onDownloadClick}
        onUpload={openUpload}
        onWhitelist={openWhitelist}
        onReport={openReport}
        onLogout={handleLogout}
      />

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
    </>
  )
}

TopBar.propTypes = {
  onDownloadClick: PropTypes.func.isRequired,
}

export default TopBar