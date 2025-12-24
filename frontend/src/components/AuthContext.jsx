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


    const login = (username) => {
        setIsAuthenticated(true);
        setUsername(username);

        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', username);
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsAuthenticated(false);
            setUsername(null);
            localStorage.clear();
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, username }}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export default AuthContext;