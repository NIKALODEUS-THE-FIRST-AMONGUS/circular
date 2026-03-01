import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
    const { user, loading, profile, isSkipped } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bg-light gap-6 p-8">
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={24} />
                </div>
                <div className="space-y-2 text-center">
                    <p className="text-text-main font-black uppercase tracking-[0.2em] text-[10px]">Establishing Secure Session</p>
                    <p className="text-text-main/70 text-[10px] font-bold uppercase tracking-widest animate-pulse">Synchronizing the Data From the Backend Gods</p>
                </div>
            </div>
        );
    }

    // Allow access if user exists and either has profile OR skipped onboarding
    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Check if profile exists or user skipped
    if (!profile && !isSkipped) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (profile?.status === 'suspended') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
