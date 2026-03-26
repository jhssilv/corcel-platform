import SidePanel from './SidePanel';
import UploadModal from '../Modals/UploadModal';
import WhitelistModal from '../Modals/WhiteListModal';
import RegisterUserModal from '../Modals/RegisterUserModal';
import ReportModal from '../Modals/ReportModal';
import { UseTopBarModals } from '../../Hooks/UI/UseTopBarModals';
import styles from '../../styles/top_bar.module.css';

interface TopBarProps {
    onDownloadClick?: () => void;
    showSidePanel?: boolean;
}

function TopBar({ onDownloadClick, showSidePanel = true }: TopBarProps) {
    const {
        username,
        isAdmin,
        isPanelOpen,
        isWhitelistOpen,
        isUploadOpen,
        isReportOpen,
        isRegisterUserOpen,
        reportTextCount,
        togglePanel,
        closePanel,
        openUpload,
        closeUpload,
        openWhitelist,
        closeWhitelist,
        openReport,
        closeReport,
        openRegisterUser,
        closeRegisterUser,
        handleManageUsers,
        handleOCR,
        handleAssignments,
        handleDownload,
        handleLogout,
    } = UseTopBarModals({ onDownloadClick });

    return (
        <>
            <div className={styles['top-bar']}>
                <button className={styles['hamburger-button']} onClick={togglePanel} aria-label="Menu">
                    <div className={styles['hamburger-line']}></div>
                    <div className={styles['hamburger-line']}></div>
                    <div className={styles['hamburger-line']}></div>
                </button>

                <div className={styles['app-title-container']}>
                    <h1 className={styles['app-title']}>CorCel 🐎</h1>
                    <p className={styles['app-subtitle']}>Ferramenta de Normalização Ortográfica</p>
                </div>

                <div className={styles['top-bar-spacer']}></div>
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

            <WhitelistModal isOpen={isWhitelistOpen} onClose={closeWhitelist} />

            <UploadModal isOpen={isUploadOpen} onClose={closeUpload} />

            <ReportModal
                isOpen={isReportOpen}
                onClose={closeReport}
                textCount={reportTextCount}
            />

            <RegisterUserModal
                isOpen={isRegisterUserOpen}
                onClose={closeRegisterUser}
            />
        </>
    );
}

export default TopBar;
