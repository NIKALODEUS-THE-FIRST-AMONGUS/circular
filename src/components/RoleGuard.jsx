import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RoleGuard = ({ children, allowedRoles }) => {
    const { profile } = useAuth();

    if (!profile || !allowedRoles.includes(profile.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default RoleGuard;
