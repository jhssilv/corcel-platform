import type { ReactNode } from 'react';

export interface ProtectedRouteProps {
  children: ReactNode;
}

export interface TopBarProps {
  onDownloadClick?: () => void;
  showSidePanel?: boolean;
}

export interface SidePanelActionProps {
  onDownload: () => void;
  onUpload: () => void;
  onWhitelist: () => void;
  onReport: () => void;
  onLogout: () => void;
  onRegisterUser?: () => void;
  onManageUsers?: () => void;
  onOCR?: () => void;
  onAssignments?: () => void;
}
