import { Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { useAuth } from '../../Context/Auth/UseAuth';

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
