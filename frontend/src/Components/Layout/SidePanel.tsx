import downloadIcon from '../../assets/download.svg';
import logoutIcon from '../../assets/logout.svg';
import registerIcon from '../../assets/register.svg';
import reportIcon from '../../assets/report.svg';
import uploadIcon from '../../assets/upload.svg';
import whitelistIcon from '../../assets/whitelist.svg';
import { Icon, IconButton, Stack } from '../Generic';
import styles from '../../styles/top_bar.module.css';

interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    username: string | null;
    isAdmin: boolean;
    onDownload: () => void;
    onUpload: () => void;
    onWhitelist: () => void;
    onReport: () => void;
    onRegisterUser?: () => void;
    onManageUsers?: () => void;
    onOCR?: () => void;
    onAssignments?: () => void;
    onLogout: () => void;
}

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
    onAssignments,
    onLogout,
}: SidePanelProps) {
    return (
        <>
            {isOpen && <div className={styles['panel-overlay']} onClick={onClose}></div>}

            <Stack direction="vertical" className={`${styles['side-panel']} ${isOpen ? styles.open : ''}`} data-testid="side-panel" data-open={isOpen ? 'true' : 'false'}>
                <Stack alignX="space-between" alignY="center" className={styles['panel-header']}>
                    <span className={styles['username-display']}>Olá, {username}.</span>
                    <IconButton className={styles['close-button']} onClick={onClose} icon="X" label="Fechar menu" variant="neutral" />
                </Stack>

                <Stack direction="vertical" className={styles['panel-content']} data-testid="side-panel-content">
                    <Stack direction="vertical" gap={16} className={styles['panel-main-section']}>
                        <button className={`${styles['panel-button']} ${styles['download-button']}`} onClick={onDownload}>
                            <img src={downloadIcon || '/placeholder.svg'} alt="" className={styles['button-icon-svg']} />
                            <span className={styles['button-text']}>Download</span>
                        </button>

                        <button className={`${styles['panel-button']} ${styles['upload-button']}`} onClick={onUpload}>
                            <img src={uploadIcon || '/placeholder.svg'} alt="" className={styles['button-icon-svg']} />
                            <span className={styles['button-text']}>Upload</span>
                        </button>

                        <button className={`${styles['panel-button']} ${styles['whitelist-button']}`} onClick={onWhitelist}>
                            <img src={whitelistIcon || '/placeholder.svg'} alt="" className={styles['button-icon-svg']} />
                            <span className={styles['button-text']}>Whitelist</span>
                        </button>

                        <button className={`${styles['panel-button']} ${styles['report-button']}`} onClick={onReport}>
                            <img src={reportIcon || '/placeholder.svg'} alt="" className={styles['button-icon-svg']} />
                            <span className={styles['button-text']}>Gerar Relatório</span>
                        </button>

                        {isAdmin && (
                            <>
                                <button className={`${styles['panel-button']} ${styles['register-button']}`} onClick={onRegisterUser}>
                                    <img src={registerIcon || '/placeholder.svg'} alt="" className={styles['button-icon-svg']} />
                                    <span className={styles['button-text']}>Registrar Usuário</span>
                                </button>
                                <button className={`${styles['panel-button']} ${styles['manage-users-button']}`} onClick={onManageUsers}>
                                    <img src={registerIcon || '/placeholder.svg'} alt="" className={styles['button-icon-svg']} />
                                    <span className={styles['button-text']}>Gerenciar Usuários</span>
                                </button>
                            </>
                        )}
                    </Stack>

                    <div className={styles['panel-ocr-section']}>
                        <button className={`${styles['panel-button']} ${styles['ocr-button']}`} onClick={onOCR}>
                            <Icon name="Camera" color="current" size={20} />
                            <span className={styles['button-text']}>Módulo OCR</span>
                        </button>
                        <button className={`${styles['panel-button']} ${styles['assignments-button']}`} onClick={onAssignments}>
                            <Icon name="ClipboardList" color="current" size={20} />
                            <span className={styles['button-text']}>Atribuir Textos</span>
                        </button>
                    </div>

                    <div className={styles['panel-logout-section']}>
                        <button className={`${styles['panel-button']} ${styles['logout-button']}`} onClick={onLogout} data-testid="logout-button">
                            <img src={logoutIcon || '/placeholder.svg'} alt="" className={styles['button-icon-svg']} />
                            <span className={styles['button-text']}>Sair</span>
                        </button>
                    </div>
                </Stack>
            </Stack>
        </>
    );
}

export default SidePanel;
