import { createContext, useState, useEffect} from 'react';
import PropTypes from 'prop-types';

//          AUTH CONTEXT         \\

// Used for storing the login context \\

const AuthContext = createContext();
export const AuthProvider = ({ children }) => {

    const [isAuthenticated, setIsAuthenticated] = useState(() =>{
        return localStorage.getItem('isAuthenticated') === 'true'    
    });
    
    const [userId, setUserId] = useState(() => {
        return localStorage.getItem('userId');
    });

    const [username, setUsername] = useState(() => {
        return localStorage.getItem('username');
    })


    const login = (id, username) => {
        setIsAuthenticated(true);
        setUserId(id);
        setUsername(username);

        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', id);
        localStorage.setItem('username', username);
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUserId(null);
        setUsername(null);

        localStorage.clear();
        navigate("/");
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, userId, login, logout, username }}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export default AuthContext;