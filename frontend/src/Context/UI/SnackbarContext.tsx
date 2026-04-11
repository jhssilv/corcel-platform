import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import SnackbarContainer from '../../Components/UI/SnackbarContainer';

export type SnackbarPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
export type SnackbarType = 'success' | 'error' | 'info' | 'warning' | 'default';

export interface SnackbarMessage {
    id: string;
    text: string;
    type?: SnackbarType;
    position?: SnackbarPosition;
    duration?: number;
    actionText?: string;
    onAction?: () => void;
}

interface SnackbarContextType {
    addSnackbar: (snackbar: Omit<SnackbarMessage, 'id'>) => void;
    removeSnackbar: (id: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const SnackbarProvider = ({ children }: { children: ReactNode }) => {
    const [snackbars, setSnackbars] = useState<SnackbarMessage[]>([]);

    const addSnackbar = useCallback((snackbar: Omit<SnackbarMessage, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        setSnackbars((prev) => [...prev, { ...snackbar, id }]);
    }, []);

    const removeSnackbar = useCallback((id: string) => {
        setSnackbars((prev) => prev.filter((s) => s.id !== id));
    }, []);

    return (
        <SnackbarContext.Provider value={{ addSnackbar, removeSnackbar }}>
            {children}
            <SnackbarContainer snackbars={snackbars} removeSnackbar={removeSnackbar} />
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => {
    const context = useContext(SnackbarContext);
    if (!context) {
        throw new Error('useSnackbar must be used within a SnackbarProvider');
    }
    return context;
};
