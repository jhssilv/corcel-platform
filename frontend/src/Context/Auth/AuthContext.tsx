import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getCurrentUser, logoutUser } from '../../Api';
import { STORAGE_KEYS } from '../../types/constants/storageKeys';
import { useSnackbar } from '../Generic';

export interface AuthContextValue {
    isAuthenticated: boolean;
    isAuthLoading: boolean;
    username: string | null;
    isAdmin: boolean;
    login: (username: string, isAdmin: boolean) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

const setStoredAuth = (nextUsername: string, nextIsAdmin: boolean) => {
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
    localStorage.setItem(STORAGE_KEYS.USERNAME, nextUsername);
    localStorage.setItem(STORAGE_KEYS.IS_ADMIN, nextIsAdmin.toString());
};

const clearStoredAuth = () => {
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.IS_ADMIN);
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const { addSnackbar } = useSnackbar();
    
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
    });

    const [username, setUsername] = useState<string | null>(() => {
        return localStorage.getItem(STORAGE_KEYS.USERNAME);
    });

    const [isAdmin, setIsAdmin] = useState<boolean>(() => {
        return localStorage.getItem(STORAGE_KEYS.IS_ADMIN) === 'true';
    });

    const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
    const isAuthenticatedRef = useRef(isAuthenticated);

    useEffect(() => {
        isAuthenticatedRef.current = isAuthenticated;
    }, [isAuthenticated]);

    const login = useCallback((nextUsername: string, nextIsAdmin: boolean) => {
        setIsAuthenticated(true);
        setUsername(nextUsername);
        setIsAdmin(nextIsAdmin);
        setIsAuthLoading(false);

        setStoredAuth(nextUsername, nextIsAdmin);
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsAuthenticated(false);
            setUsername(null);
            setIsAdmin(false);
            setIsAuthLoading(false);
            clearStoredAuth();
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const syncAuthFromSession = async () => {
            try {
                const currentUser = await getCurrentUser();

                if (!mounted) {
                    return;
                }

                setIsAuthenticated(true);
                setUsername(currentUser.username);
                setIsAdmin(currentUser.isAdmin);
                setStoredAuth(currentUser.username, currentUser.isAdmin);
            } catch {
                if (!mounted) {
                    return;
                }

                setIsAuthenticated(false);
                setUsername(null);
                setIsAdmin(false);
                clearStoredAuth();
            } finally {
                if (mounted) {
                    setIsAuthLoading(false);
                }
            }
        };

        void syncAuthFromSession();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const handleUnauthorized = () => {
            if (!isAuthenticatedRef.current) {
                return;
            }

            addSnackbar({ text: 'Sua sessão expirou. Por favor, faça login novamente.', type: 'error', duration: 5000 });
            void logout();
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, [logout]);

    const contextValue = useMemo(
        () => ({ isAuthenticated, isAuthLoading, login, logout, username, isAdmin }),
        [isAuthenticated, isAuthLoading, login, logout, username, isAdmin],
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
