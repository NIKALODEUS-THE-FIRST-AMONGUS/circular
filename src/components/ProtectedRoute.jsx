import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Clock, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase-config';

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

    // ── Pending users: show approval waiting room instead of the dashboard ──
    // This prevents ALL Firestore queries from firing for unapproved accounts.
    if (profile?.status === 'pending') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bg-light p-8">
                <div className="max-w-sm w-full bg-bg-surface rounded-[28px] border border-border-light shadow-xl p-8 text-center space-y-6">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
                        <Clock size={32} className="text-amber-500" />
                    </div>

                    {/* Text */}
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-text-main">Awaiting Approval</h2>
                        <p className="text-sm text-text-muted leading-relaxed">
                            Your account is pending review by an administrator.<br />
                            You'll get access once they approve your membership.
                        </p>
                    </div>

                    {/* User info */}
                    <div className="px-4 py-3 bg-surface-light rounded-xl border border-border-light text-left space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Registered as</p>
                        <p className="text-sm font-bold text-text-main truncate">{profile?.full_name || user?.displayName || 'Member'}</p>
                        <p className="text-xs text-text-muted truncate">{user?.email}</p>
                    </div>

                    {/* What to expect */}
                    <div className="text-left space-y-2 text-xs text-text-muted bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <p className="font-black text-blue-600 uppercase tracking-wider text-[10px]">What happens next?</p>
                        <ul className="space-y-1 list-disc list-inside text-blue-700">
                            <li>An admin will review your registration</li>
                            <li>Your account will be activated</li>
                            <li>Reload this page to check your status</li>
                        </ul>
                    </div>

                    {/* Sign out */}
                    <button
                        onClick={() => signOut(auth)}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-text-muted hover:text-text-main hover:border-gray-300 transition-all text-sm font-bold"
                    >
                        <LogOut size={16} />
                        Sign out
                    </button>
                </div>

                {/* Refresh hint */}
                <p className="mt-6 text-[10px] text-text-muted/60 font-bold uppercase tracking-widest">
                    Refresh the page to check your access status
                </p>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;

