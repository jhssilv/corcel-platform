import { Navigate } from 'react-router-dom';
import { useAuth } from '../../Context/Auth/UseAuth';
import type { ProtectedRouteProps } from '../../types';

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
    const { isAuthenticated, isAdmin, isAuthLoading } = useAuth();

    if (isAuthLoading) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/main" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
