import { Navigate } from 'react-router-dom';
import { useAuth } from './functions/useAuth.jsx';
import PropTypes from 'prop-types';

//      PROTECTED ROUTE COMPONENT       \\

// used for blocking access before login \\

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

export default ProtectedRoute;