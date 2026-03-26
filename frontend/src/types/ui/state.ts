import type { TextDetail, TextMetadata } from '../domain/text';

export interface MainPageState {
  selectedEssay: TextMetadata | null;
  currentText: TextDetail | null;
  showDownloadDialog: boolean;
  refreshTrigger: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  isAdmin: boolean;
}

export interface SelectionState {
  selectedStartIndex: number | null;
  selectedEndIndex: number | null;
  hoveredIndex: number | null;
}
