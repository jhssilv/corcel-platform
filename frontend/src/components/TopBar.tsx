import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidePanel from './SidePanel';
import UploadModal from './UploadModal';
import WhitelistModal from './WhiteListModal';
import RegisterUserModal from './RegisterUserModal';
import ReportModal from './ReportModal';
import { useAuth } from './functions/useAuth';
import { STORAGE_KEYS } from '../types/constants/storageKeys';
import '../styles/top_bar.css';

interface TopBarProps {
  onDownloadClick?: () => void;
  showSidePanel?: boolean;
}

function TopBar({ onDownloadClick, showSidePanel = true }: TopBarProps) {
  const { logout, username, isAdmin } = useAuth();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isWhitelistOpen, setIsWhitelistOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isRegisterUserOpen, setIsRegisterUserOpen] = useState(false);
  const [reportTextCount, setReportTextCount] = useState(0);

  const navigate = useNavigate();

  const togglePanel = () => setIsPanelOpen((open) => !open);
  const closePanel = () => setIsPanelOpen(false);

  const openUpload = () => {
    setIsUploadOpen(true);
    closePanel();
  };

  const openWhitelist = () => {
    setIsWhitelistOpen(true);
    closePanel();
  };

  const openReport = () => {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEXT_IDS) || '[]');
    const textIds = Array.isArray(parsed) ? parsed : [];

    setReportTextCount(textIds.length);
    setIsReportOpen(true);
    closePanel();
  };

  const openRegisterUser = () => {
    setIsRegisterUserOpen(true);
    closePanel();
  };

  const handleManageUsers = () => {
    navigate('/users');
    closePanel();
  };

  const handleOCR = () => {
    navigate('/ocr');
    closePanel();
  };

  const handleAssignments = () => {
    navigate('/assignments');
    closePanel();
  };

  const handleDownload = () => {
    onDownloadClick?.();
    closePanel();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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

      {showSidePanel ? (
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
        />
      ) : null}

      <WhitelistModal isOpen={isWhitelistOpen} onClose={() => setIsWhitelistOpen(false)} />

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

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
  );
}

export default TopBar;
