import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../context/NetworkContext';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { getBrandName } from '../config/branding';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    FileText,
    Bell,
    LogOut,
    PlusCircle,
    UserCircle,
    BadgeInfo,
    ShieldAlert,
    ChevronRight,
    Settings,
    Moon,
    Sun,
    Trash2,
    FilePenLine,
    MessageSquarePlus
} from 'lucide-react';

// Compact Logo for Sidebar
const CompactLogo = () => {
    const { language } = useLanguage();
    const brandName = getBrandName(language);
    const parts = brandName.split('X');
    
    return (
        <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 25L75 75" stroke="#FF9933" strokeWidth="12" strokeLinecap="round"/>
                <path d="M25 75L75 25" stroke="#138808" strokeWidth="12" strokeLinecap="round"/>
                <rect x="45" y="40" width="10" height="20" transform="rotate(45 45 40)" fill="white"/>
            </svg>
            <span className="text-base font-bold tracking-tight text-text-main flex items-center">
                <span>{parts[0]}</span>
                <span className="text-[#FF9933]">X</span>
                <span className="ml-[0.15em]">{parts[1]}</span>
            </span>
        </div>
    );
};

const Sidebar = ({ isOpen, onClose }) => {
    const { profile, isAdmin, isTeacher, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { isOffline, isChecking } = useNetwork();
    const location = useLocation();

    const isProfileIncomplete = () => {
        if (!profile) return false;
        if (profile.status === 'skipped') return true;
        if (!profile.full_name) return true;

        if (profile.role === 'admin') return false;
        if (profile.role === 'student') return !profile.class_branch;
        if (profile.role === 'teacher') return !profile.class_branch || !profile.college_role;

        return false;
    };

    const isIncomplete = isProfileIncomplete();

    const navigation = [
        {
            section: 'Hub',
            items: [
                { path: '/dashboard', label: 'Circular Center', icon: LayoutDashboard },
                ...(isTeacher || isAdmin ? [{ path: '/dashboard/create', label: 'Post', icon: PlusCircle }] : []),
                ...(isTeacher || isAdmin ? [{ path: '/dashboard/drafts', label: 'Drafts', icon: FilePenLine }] : []),
                ...(isTeacher || isAdmin ? [{ path: '/dashboard/my-posts', label: 'My Hub', icon: FileText }] : []),
            ]
        },
        ...(isAdmin ? [{
            section: 'Administrative',
            items: [
                { path: '/dashboard/approvals', label: 'Approvals', icon: ShieldAlert },
                { path: '/dashboard/manage-users', label: 'Members', icon: Users },
                { path: '/dashboard/audit-logs', label: 'Logs', icon: BadgeInfo },
            ]
        }] : []),
        {
            section: 'Settings',
            items: [
                { path: '/dashboard/feedback', label: 'Feedback', icon: MessageSquarePlus },
                { path: '/dashboard/profile', label: 'Preferences', icon: Settings },
            ]
        }
    ];

    return (
        <aside
            className={`
                fixed inset-y-0 left-0 z-[60] w-[280px] bg-bg-light border-r border-border-light flex flex-col transition-transform duration-300 ease-in-out shadow-2xl
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
            {/* Brand Logo with Tricolor Accent */}
            <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] flex">
                    <div className="flex-1 bg-[#FF9933]" />
                    <div className="flex-1 bg-white" />
                    <div className="flex-1 bg-[#138808]" />
                </div>
                <div className="p-4 lg:p-6 mb-2 pt-6">
                    <CompactLogo />
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-3 space-y-8 overflow-y-auto overflow-x-hidden">
                {navigation.map((group) => (
                    <div key={group.section} className="space-y-1">
                        <h3 className="px-4 text-[9px] font-black text-text-dim uppercase tracking-[.2em] mb-2">
                            {group.section}
                        </h3>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={onClose}
                                        className="relative block group"
                                    >
                                        <div
                                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive
                                                ? 'bg-primary-container text-primary font-bold'
                                                : 'text-text-secondary hover:bg-surface-variant'
                                                }`}
                                        >
                                            <div className="min-w-[24px] flex justify-center">
                                                <item.icon
                                                    size={20}
                                                    strokeWidth={isActive ? 2.5 : 2}
                                                    className={`${isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-main'} transition-colors`}
                                                />
                                            </div>
                                            <span className="text-[13px] tracking-tight">
                                                {item.label}
                                                {item.path === '/dashboard/profile' && isIncomplete && (
                                                    <span className="inline-block h-1.5 w-1.5 bg-danger rounded-full ml-2 animate-pulse" />
                                                )}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Profile / Logout Footer */}
            <div className="p-6 border-t border-outline/30">
                <div className="bg-surface-light p-5 space-y-5 rounded-3xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-primary/5 rounded-full border border-primary/20 flex items-center justify-center text-primary font-black overflow-hidden uppercase">
                            {profile?.avatar_url ? (
                                <img 
                                    src={profile.avatar_url} 
                                    alt="Profile" 
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.textContent = (profile?.full_name || profile?.email)?.[0] || 'U';
                                    }}
                                />
                            ) : (
                                (profile?.full_name || profile?.email)?.[0] || 'U'
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-black text-text-main truncate uppercase tracking-tighter">
                                {profile?.academic_title && <span className="font-medium normal-case">{profile.academic_title}. </span>}
                                {profile?.gender_title && <span className="font-medium normal-case">{profile.gender_title}. </span>}
                                {!profile?.academic_title && !profile?.gender_title && profile?.title && <span className="font-medium normal-case">{profile.title}. </span>}
                                {profile?.full_name || user?.email?.split('@')[0] || profile?.role || 'User'}
                            </p>
                            <p className="text-[9px] text-text-dim font-bold truncate uppercase tracking-widest">
                                {profile?.department ? `${profile.department} HUB` : profile?.role}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="flex-1 flex items-center justify-center gap-3 bg-surface-light hover:bg-primary/10 hover:text-primary font-black py-3 rounded-2xl transition-all active:scale-95 group border border-border-light"
                        >
                            {theme === 'light' ? (
                                <><Moon size={14} /><span className="text-[11px] uppercase tracking-[0.15em]">Dark Mode</span></>
                            ) : (
                                <><Sun size={14} /><span className="text-[11px] uppercase tracking-[0.15em]">Light Mode</span></>
                            )}
                        </button>
                        <button
                            onClick={async () => {
                                // Clear local session immediately (works offline)
                                Object.keys(localStorage).forEach(k => {
                                    if (k.startsWith('sb-')) localStorage.removeItem(k);
                                });
                                // Try API signout in background (may fail on bad network)
                                supabase.auth.signOut().catch(() => { });
                                window.location.href = '/';
                            }}
                            className="h-12 w-12 flex items-center justify-center bg-danger/5 hover:bg-danger/10 text-danger rounded-2xl transition-all active:scale-95 border border-danger/10"
                            title="Sign Out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>

                {/* Network Status Badge */}
                <div className="mt-4 flex justify-center">
                    {isChecking ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Checking Network</span>
                        </div>
                    ) : isOffline ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 shadow-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Adaptive Mock Mode</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Live System</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 text-[8px] text-center font-black text-text-dim uppercase tracking-widest opacity-50">
                    <div className="inline-flex items-center gap-1">
                        <svg width="12" height="8" viewBox="0 0 30 20" className="inline-block rounded-[1px] overflow-hidden">
                            <rect width="30" height="6.67" fill="#FF9933"/>
                            <rect y="6.67" width="30" height="6.67" fill="#FFFFFF"/>
                            <rect y="13.33" width="30" height="6.67" fill="#138808"/>
                            <g transform="translate(15, 10)">
                                <circle cx="0" cy="0" r="2.5" fill="none" stroke="#000080" strokeWidth="0.3"/>
                                <circle cx="0" cy="0" r="0.3" fill="#000080"/>
                                {[...Array(24)].map((_, i) => {
                                    const angle = (i * 15 * Math.PI) / 180;
                                    const x = 2.2 * Math.cos(angle);
                                    const y = 2.2 * Math.sin(angle);
                                    return (
                                        <line
                                            key={i}
                                            x1="0"
                                            y1="0"
                                            x2={x}
                                            y2={y}
                                            stroke="#000080"
                                            strokeWidth="0.12"
                                        />
                                    );
                                })}
                            </g>
                        </svg>
                        <span>Proudly Built for India</span>
                    </div>
                    <div className="mt-1">Build 2026.03.01 (Stable)</div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
