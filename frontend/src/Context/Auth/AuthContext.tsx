import { createContext, useEffect, useState, type ReactNode } from 'react';
import { logoutUser } from '../../Api';

export interface AuthContextValue {
    isAuthenticated: boolean;
    username: string | null;
    isAdmin: boolean;
    login: (username: string, isAdmin: boolean) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return localStorage.getItem('isAuthenticated') === 'true';
    });

    const [username, setUsername] = useState<string | null>(() => {
        return localStorage.getItem('username');
    });

    const [isAdmin, setIsAdmin] = useState<boolean>(() => {
        return localStorage.getItem('isAdmin') === 'true';
    });

    const login = (nextUsername: string, nextIsAdmin: boolean) => {
        setIsAuthenticated(true);
        setUsername(nextUsername);
        setIsAdmin(nextIsAdmin);

        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', nextUsername);
        localStorage.setItem('isAdmin', nextIsAdmin.toString());
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsAuthenticated(false);
            setUsername(null);
            setIsAdmin(false);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('username');
            localStorage.removeItem('isAdmin');
        }
    };

    useEffect(() => {
        const handleUnauthorized = () => {
            alert('Sua sessão expirou. Por favor, faça login novamente.');
            void logout();
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, username, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
