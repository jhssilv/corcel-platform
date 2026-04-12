import { IconButton, MenuActionItem, Stack } from '../Generic';
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

                <Stack direction="vertical" gap={12} className={styles['panel-content']} data-testid="side-panel-content">
                    <MenuActionItem icon="Upload" label="Upload" onClick={onUpload} testId="upload" />
                    <MenuActionItem icon="Download" label="Download" onClick={onDownload} testId="download" />
                    <MenuActionItem icon="ListChecks" label="Whitelist" onClick={onWhitelist} testId="whitelist" />
                    <MenuActionItem icon="FileBarChart" label="Gerar Relatório" onClick={onReport} testId="report" />

                    <Stack direction="vertical" gap={12} className={styles['panel-group-separator']}>
                        {isAdmin ? (
                            <MenuActionItem icon="UserPlus" label="Registrar Usuário" onClick={onRegisterUser ?? (() => undefined)} disabled={!onRegisterUser} />
                        ) : null}
                        {isAdmin ? (
                            <MenuActionItem icon="Users" label="Gerenciar Usuários" onClick={onManageUsers ?? (() => undefined)} disabled={!onManageUsers} navigates />
                        ) : null}
                        <MenuActionItem icon="ClipboardList" label="Atribuir Textos" onClick={onAssignments ?? (() => undefined)} disabled={!onAssignments} navigates testId="assignments" />
                    </Stack>

                    <Stack direction="vertical" gap={12} className={styles['panel-group-separator']}>
                        <MenuActionItem icon="Camera" label="Módulo OCR" onClick={onOCR ?? (() => undefined)} disabled={!onOCR} navigates testId="ocr" />
                    </Stack>

                    <Stack direction="vertical" gap={12} className={styles['panel-group-last']}>
                        <MenuActionItem
                            icon="LogOut"
                            label="Sair"
                            onClick={onLogout}
                            emphasis="danger"
                            testId="logout-button"
                        />
                    </Stack>
                </Stack>
            </Stack>
        </>
    );
}

export default SidePanel;
