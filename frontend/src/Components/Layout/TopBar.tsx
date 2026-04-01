import { useEffect, useState } from 'react';
import SidePanel from './SidePanel';
import UploadModal from '../Modals/UploadModal';
import WhitelistModal from '../Modals/WhiteListModal';
import RegisterUserModal from '../Modals/RegisterUserModal';
import ReportModal from '../Modals/ReportModal';
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
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
                    <h1 className={styles['app-title']}>CorSpell 🐎</h1>
                    <p className={styles['app-subtitle']}>Ferramenta de Normalização Ortográfica</p>
                </div>

                <ThemeToggle />

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
