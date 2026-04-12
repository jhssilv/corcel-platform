import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/Auth/UseAuth';
import { STORAGE_KEYS } from '../../types/constants/storageKeys';

interface UseTopBarModalsOptions {
    onDownloadClick?: () => void;
}

interface UseTopBarModalsResult {
    username: string | null;
    isAdmin: boolean;
    isPanelOpen: boolean;
    isWhitelistOpen: boolean;
    isUploadOpen: boolean;
    isDownloadOpen: boolean;
    isReportOpen: boolean;
    isRegisterUserOpen: boolean;
    reportTextCount: number;
    togglePanel: () => void;
    closePanel: () => void;
    openUpload: () => void;
    closeUpload: () => void;
    openDownload: () => void;
    closeDownload: () => void;
    openWhitelist: () => void;
    closeWhitelist: () => void;
    openReport: () => void;
    closeReport: () => void;
    openRegisterUser: () => void;
    closeRegisterUser: () => void;
    handleManageUsers: () => void;
    handleOCR: () => void;
    handleAssignments: () => void;
    handleDownload: () => void;
    handleLogout: () => Promise<void>;
}

export function UseTopBarModals({ onDownloadClick }: UseTopBarModalsOptions = {}): UseTopBarModalsResult {
    const { logout, username, isAdmin } = useAuth();
    const navigate = useNavigate();

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isWhitelistOpen, setIsWhitelistOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isRegisterUserOpen, setIsRegisterUserOpen] = useState(false);
    const [reportTextCount, setReportTextCount] = useState(0);

    const togglePanel = () => setIsPanelOpen((open) => !open);
    const closePanel = () => setIsPanelOpen(false);

    const openUpload = () => {
        setIsUploadOpen(true);
        closePanel();
    };

    const closeUpload = () => setIsUploadOpen(false);

    const openDownload = () => {
        setIsDownloadOpen(true);
        closePanel();
    };

    const closeDownload = () => setIsDownloadOpen(false);

    const openWhitelist = () => {
        setIsWhitelistOpen(true);
        closePanel();
    };

    const closeWhitelist = () => setIsWhitelistOpen(false);

    const openReport = () => {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEXT_IDS) || '[]');
        const textIds = Array.isArray(parsed) ? parsed : [];

        setReportTextCount(textIds.length);
        setIsReportOpen(true);
        closePanel();
    };

    const closeReport = () => setIsReportOpen(false);

    const openRegisterUser = () => {
        setIsRegisterUserOpen(true);
        closePanel();
    };

    const closeRegisterUser = () => setIsRegisterUserOpen(false);

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
        if (onDownloadClick) {
            onDownloadClick();
        } else {
            openDownload();
        }
        closePanel();
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return {
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
    };
}
