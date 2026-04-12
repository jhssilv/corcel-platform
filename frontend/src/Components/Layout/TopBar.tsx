import { useEffect, useState } from 'react';
import SidePanel from './SidePanel';
import UploadModal from '../Modals/UploadModal';
import WhitelistModal from '../Modals/WhiteListModal';
import RegisterUserModal from '../Modals/RegisterUserModal';
import ReportModal from '../Modals/ReportModal';
import DownloadDialog from '../Modals/DownloadDialog';
import { Icon, Stack } from '../Generic';
import { UseTopBarModals } from '../../Hooks/UI/UseTopBarModals';
import { initTheme, toggleTheme, getCurrentTheme } from '../../Services/theme';
import styles from '../../styles/top_bar.module.css';

interface TopBarProps {
    onDownloadClick?: () => void;
    showSidePanel?: boolean;
}

function ThemeToggle() {
    const [theme, setTheme] = useState(() => initTheme());

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const handleChange = () => {
            if (!localStorage.getItem('theme-preference')) {
                setTheme(initTheme());
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const handleToggle = () => {
        const newTheme = toggleTheme();
        setTheme(newTheme);
    };

    return (
        <button
            className={styles['theme-toggle-button']}
            onClick={handleToggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
            {theme === 'dark' ? (
                <Icon name="Sun" color="black" strokeWidth={1.75} style={{ color: 'currentColor' }} />
            ) : (
                <Icon name="Moon" color="black" strokeWidth={1.75} style={{ color: 'currentColor' }} />
            )}
        </button>
    );
}


function TopBar({ onDownloadClick, showSidePanel = true }: TopBarProps) {
    const {
        username,
        isAdmin,
        isPanelOpen,
        isWhitelistOpen,
        isUploadOpen,
        isDownloadOpen,
        isReportOpen,
        isRegisterUserOpen,
        reportTextCount,
        togglePanel,
        closePanel,
        openUpload,
        closeUpload,
        openDownload,
        closeDownload,
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
            <Stack alignY="center" className={styles['top-bar']}>
                <button className={styles['hamburger-button']} onClick={togglePanel} aria-label="Menu">
                    <div className={styles['hamburger-line']}></div>
                    <div className={styles['hamburger-line']}></div>
                    <div className={styles['hamburger-line']}></div>
                </button>

                <div className={styles['app-title-container']}>
                    <h1 className={styles['app-title']}>CorSpell 🐎</h1>
                    <p className={styles['app-subtitle']}>Ferramenta de Normalização Ortográfica</p>
                </div>

                <ThemeToggle />

                <div className={styles['top-bar-spacer']}></div>
            </Stack>

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

            <DownloadDialog
                show={isDownloadOpen}
                onClose={closeDownload}
            />

            <RegisterUserModal
                isOpen={isRegisterUserOpen}
                onClose={closeRegisterUser}
            />
        </>
    );
}

export default TopBar;
