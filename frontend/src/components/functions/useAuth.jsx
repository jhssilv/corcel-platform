import { useContext } from 'react';
import AuthContext from '../auth_context.jsx';

export const useAuth = () => {
    return useContext(AuthContext);
};