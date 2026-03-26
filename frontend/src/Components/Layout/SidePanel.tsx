import downloadIcon from '../../assets/download.svg';
import logoutIcon from '../../assets/logout.svg';
import registerIcon from '../../assets/register.svg';
import reportIcon from '../../assets/report.svg';
import uploadIcon from '../../assets/upload.svg';
import whitelistIcon from '../../assets/whitelist.svg';

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
            {isOpen && <div className="panel-overlay" onClick={onClose}></div>}

            <div className={`side-panel ${isOpen ? 'open' : ''}`}>
                <div className="panel-header">
                    <span className="username-display">Olá, {username}.</span>
                    <button className="close-button" onClick={onClose} aria-label="Close menu">
                        ×
                    </button>
                </div>

                <div className="panel-content">
                    <div className="panel-main-section">
                        <button className="panel-button download-button" onClick={onDownload}>
                            <img src={downloadIcon || '/placeholder.svg'} alt="" className="button-icon-svg" />
                            <span className="button-text">Download</span>
                        </button>

                        <button className="panel-button upload-button" onClick={onUpload}>
                            <img src={uploadIcon || '/placeholder.svg'} alt="" className="button-icon-svg" />
                            <span className="button-text">Upload</span>
                        </button>

                        <button className="panel-button whitelist-button" onClick={onWhitelist}>
                            <img src={whitelistIcon || '/placeholder.svg'} alt="" className="button-icon-svg" />
                            <span className="button-text">Whitelist</span>
                        </button>

                        <button className="panel-button report-button" onClick={onReport}>
                            <img src={reportIcon || '/placeholder.svg'} alt="" className="button-icon-svg" />
                            <span className="button-text">Gerar Relatório</span>
                        </button>

                        {isAdmin && (
                            <>
                                <button className="panel-button register-button" onClick={onRegisterUser}>
                                    <img src={registerIcon || '/placeholder.svg'} alt="" className="button-icon-svg" />
                                    <span className="button-text">Registrar Usuário</span>
                                </button>
                                <button className="panel-button manage-users-button" onClick={onManageUsers}>
                                    <img src={registerIcon || '/placeholder.svg'} alt="" className="button-icon-svg" />
                                    <span className="button-text">Gerenciar Usuários</span>
                                </button>
                            </>
                        )}
                    </div>

                    <div className="panel-ocr-section">
                        <button className="panel-button ocr-button" onClick={onOCR}>
                            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>📷</span>
                            <span className="button-text">Módulo OCR</span>
                        </button>
                        <button className="panel-button assignments-button" onClick={onAssignments}>
                            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>📋</span>
                            <span className="button-text">Atribuir Textos</span>
                        </button>
                    </div>

                    <div className="panel-logout-section">
                        <button className="panel-button logout-button" onClick={onLogout}>
                            <img src={logoutIcon || '/placeholder.svg'} alt="" className="button-icon-svg" />
                            <span className="button-text">Sair</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default SidePanel;
