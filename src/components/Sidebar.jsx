import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNetwork } from '../context/NetworkContext';
import { useTheme } from '../hooks/useTheme';
import { auth } from '../lib/firebase-config';
import { signOut } from 'firebase/auth';
import { optimizeCloudinaryUrl } from '../lib/cloudinary';
import {
    LogOut,
    Moon,
    Sun,
    Circle
} from 'lucide-react';

// Navigation items with Material Icons class names
const getNavItems = (isAdmin, isTeacher) => {
    const items = [
        { path: '/dashboard', label: 'Circular Center', icon: 'radio_button_checked', iconClass: 'text-[20px]' },
    ];

    if (isTeacher || isAdmin) {
        items.push(
            { path: '/dashboard/create', label: 'Post', icon: 'edit_note', iconClass: 'text-[22px]' },
            { path: '/dashboard/drafts', label: 'Drafts', icon: 'drafts', iconClass: 'text-[22px]' },
            { path: '/dashboard/my-posts', label: 'My Hub', icon: 'hub', iconClass: 'text-[22px]' }
        );
    }

    if (isAdmin) {
        items.push(
            { path: '/dashboard/approvals', label: 'Approvals', icon: 'task_alt', iconClass: 'text-[22px]', badge: true },
            { path: '/dashboard/manage-users', label: 'Members', icon: 'group', iconClass: 'text-[22px]' }
        );
    }

    return items;
};

const getManagementItems = () => [
    { path: '/dashboard/audit-logs', label: 'Logs', icon: 'history', iconClass: 'text-[22px]' },
    { path: '/dashboard/feedback', label: 'Feedback', icon: 'chat', iconClass: 'text-[22px]' },
    { path: '/dashboard/profile', label: 'Settings', icon: 'settings', iconClass: 'text-[22px]' }
];

// Material Icon Component
const MaterialIcon = ({ icon, className = '' }) => {
    return <span className={`material-symbols-outlined ${className}`}>{icon}</span>;
};

const Sidebar = ({ isOpen, onClose }) => {
    const { profile, isAdmin, isTeacher, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { isOffline, isChecking } = useNetwork();
    const location = useLocation();

    const navItems = getNavItems(isAdmin, isTeacher);
    const managementItems = getManagementItems();

    // Get pending approvals count (mock for now, should come from real-time data)
    const pendingCount = 4;

    return (
        <aside
            className={`
                fixed inset-y-0 left-0 z-[60] w-72 bg-[#0f172a] text-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
        >
            {/* Branding Header */}
            <div className="flex items-center gap-3 px-6 py-8 border-b border-white/10">
                <h1 className="text-lg font-bold tracking-tight">
                    <span className="text-white">Suchna</span>
                    <span className="text-[#ec5b13]">X</span>
                    {' '}
                    <span className="text-[#22c55e]">Link</span>
                </h1>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                                isActive
                                    ? 'border-l-4 border-[#ec5b13] bg-white/5 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {isActive ? (
                                <Circle className={`${item.iconClass} text-[#ec5b13]`} fill="currentColor" size={20} />
                            ) : (
                                <MaterialIcon icon={item.icon} className={item.iconClass} />
                            )}
                            <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'} tracking-wide flex-1`}>
                                {item.label}
                            </span>
                            {item.badge && item.path === '/dashboard/approvals' && pendingCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {/* Management Section Divider */}
                <div className="my-4 mx-4 border-t border-white/10 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                        Management
                    </p>
                </div>

                {managementItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                                isActive
                                    ? 'border-l-4 border-[#ec5b13] bg-white/5 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {isActive ? (
                                <Circle className={`${item.iconClass} text-[#ec5b13]`} fill="currentColor" size={20} />
                            ) : (
                                <MaterialIcon icon={item.icon} className={item.iconClass} />
                            )}
                            <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'} tracking-wide`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section: Profile & Actions */}
            <div className="border-t border-white/10 p-4 space-y-4">
                {/* System Status Indicator */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <div className="flex items-center gap-2">
                        {isChecking ? (
                            <>
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-400"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Checking</span>
                            </>
                        ) : isOffline ? (
                            <>
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Offline</span>
                            </>
                        ) : (
                            <>
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22c55e]"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">System Live</span>
                            </>
                        )}
                    </div>
                    <button 
                        onClick={toggleTheme}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        {theme === 'light' ? (
                            <Moon className="w-4 h-4" />
                        ) : (
                            <Sun className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* User Profile Section */}
                <div className="flex items-center gap-3 px-1">
                    <div className="h-9 w-9 shrink-0 rounded-full border border-white/20 overflow-hidden">
                        {profile?.avatar_url ? (
                            <img 
                                src={optimizeCloudinaryUrl(profile.avatar_url, { width: 96, height: 96 })} 
                                alt="User Avatar" 
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const initial = (profile?.full_name || user?.email)?.[0] || 'U';
                                    e.target.parentElement.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-[#ec5b13] text-white font-bold text-sm">${initial}</div>`;
                                }}
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-[#ec5b13] text-white font-bold text-sm">
                                {(profile?.full_name || user?.email)?.[0] || 'U'}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-1 flex-col min-w-0">
                        <p className="truncate text-xs font-bold text-white">
                            {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="truncate text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                            {profile?.role === 'admin' ? 'System Admin' : profile?.role || 'User'}
                        </p>
                    </div>
                    <button 
                        onClick={async () => {
                            localStorage.clear();
                            sessionStorage.clear();
                            signOut(auth).catch(() => {});
                            window.location.href = '/';
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors flex items-center justify-center"
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                {/* Footer Branded Tag */}
                <div className="px-2 pt-2 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-40">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Made in India
                        </span>
                        <div className="flex gap-0.5">
                            <div className="h-1 w-2 bg-[#FF9933] rounded-px"></div>
                            <div className="h-1 w-2 bg-white rounded-px"></div>
                            <div className="h-1 w-2 bg-[#138808] rounded-px"></div>
                        </div>
                    </div>
                    <p className="text-[8px] text-slate-600 mt-1 uppercase tracking-widest font-bold">
                        Version 2.0.0 Stable
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
