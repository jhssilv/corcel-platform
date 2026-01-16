import { createContext, useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import { logoutUser } from './api/APIFunctions';


//          AUTH CONTEXT         \\

// Used for storing the login context \\

const AuthContext = createContext();
export const AuthProvider = ({ children }) => {

    const [isAuthenticated, setIsAuthenticated] = useState(() =>{
        return localStorage.getItem('isAuthenticated') === 'true'    
    });
    
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('username');
    })

    const [isAdmin, setIsAdmin] = useState(() => {
        return localStorage.getItem('isAdmin') === 'true'
    });

    const login = (username, isAdmin) => {
        setIsAuthenticated(true);
        setUsername(username);
        setIsAdmin(isAdmin);

        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', username);
        localStorage.setItem('isAdmin', isAdmin.toString());
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsAuthenticated(false);
            setUsername(null);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('username');
        }
    };

    useEffect(() => {
        const handleUnauthorized = () => {
            alert("Sua sessão expirou. Por favor, faça login novamente.");
            logout();
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

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export default AuthContext;