import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import RoleGuard from '../components/RoleGuard';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useIsMobile } from '../hooks/useIsMobile';
import { getBrandName, getSlogan } from '../config/branding';
import {
    Bell, Settings as SettingsIcon, LogOut, ShieldAlert,
    ShieldCheck, GraduationCap, Building2, Layers, Check, Loader2, X, RefreshCw,
    BadgeInfo, UserCircle, CheckCircle2, AlertTriangle, Info, ArrowRight, Eye
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationManager } from '../hooks/useNotificationManager';
import { useLocation } from 'react-router-dom';
import AppleIntro from '../components/AppleIntro';
import { getDocuments } from '../lib/firebase-db';
import { optimizeCloudinaryUrl } from '../lib/cloudinary';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import ProgressLoader from '../components/ProgressLoader';
import { useParallelFetch } from '../hooks/useFastFetch';
import { useNotify } from '../components/Toaster';

// Lazy load heavy route components
const CircularCenter = lazy(() => import('./CircularCenter'));
const CreateCircular = lazy(() => import('./CreateCircular'));
const Drafts = lazy(() => import('./Drafts'));
const Feedback = lazy(() => import('./Feedback'));
const MyPosts = lazy(() => import('./MyPosts'));
const ManageUsers = lazy(() => import('./ManageUsers'));
const AddMember = lazy(() => import('./AddMember'));
const SearchMembers = lazy(() => import('./SearchMembers'));
const Approvals = lazy(() => import('./Approvals'));
const CircularDetail = lazy(() => import('./CircularDetail'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const AuditLogs = lazy(() => import('./AuditLogs'));
const DiagnosticTool = lazy(() => import('./DiagnosticTool'));

const DashboardMobileV2 = lazy(() => import('./mobile/DashboardMobileV2'));
const CircularDetailMobile = lazy(() => import('./mobile/CircularDetailMobile'));
const CreateCircularMobile = lazy(() => import('./mobile/CreateCircularMobile'));
const AddMemberMobile = lazy(() => import('./mobile/AddMemberMobile'));
const ActivityCloudMobile = lazy(() => import('./mobile/ActivityCloudMobile'));

// Compact Logo for Headers
const HeaderLogo = () => {
    const { language } = useLanguage();
    const brandName = getBrandName(language);
    const parts = brandName.split('X');
    
    return (
        <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 25L75 75" stroke="#FF9933" strokeWidth="12" strokeLinecap="round"/>
                <path d="M25 75L75 25" stroke="#138808" strokeWidth="12" strokeLinecap="round"/>
                <rect x="45" y="40" width="10" height="20" transform="rotate(45 45 40)" fill="white"/>
            </svg>
            <span className="text-sm font-bold tracking-tight text-text-main hidden sm:inline flex items-center">
                <span>{parts[0]}</span>
                <span className="text-[#FF9933]">X</span>
                <span className="ml-[0.15em]">{parts[1]}</span>
            </span>
            {/* Small Indian Flag */}
            <div className="hidden md:flex h-4 w-6 rounded-sm overflow-hidden shadow-sm border border-border-light/30 ml-2 relative">
                <div className="h-full w-full flex flex-col">
                    <div className="h-[33.33%] bg-[#FF9933]"></div>
                    <div className="h-[33.33%] bg-white relative flex items-center justify-center">
                        <div className="absolute w-2 h-2 rounded-full border border-[#000080] flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-[#000080]"></div>
                        </div>
                    </div>
                    <div className="h-[33.33%] bg-[#138808]"></div>
                </div>
            </div>
        </div>
    );
};

// Helper function to format display name with title
const getDisplayName = (profile, user, options = {}) => {
    const { includeTitle = true, firstNameOnly = false } = options;
    
    let name = profile?.full_name || user?.email?.split('@')?.[0] || 'User';
    
    if (firstNameOnly) {
        name = name.split(' ')[0];
    }
    
    if (includeTitle) {
        const titles = [];
        
        // Add academic title first (Prof, HOD, etc.)
        if (profile?.academic_title) {
            titles.push(profile.academic_title);
        }
        
        // Add gender title (Mr, Mrs, Ms, Dr)
        if (profile?.gender_title) {
            titles.push(profile.gender_title);
        }
        
        // Fallback to legacy title field
        if (titles.length === 0 && profile?.title) {
            titles.push(profile.title);
        }
        
        if (titles.length > 0) {
            return `${titles.join('. ')}. ${name}`;
        }
    }
    
    return name;
};

const Dashboard = () => {
    const { profile, isSkipped, user, signOut } = useAuth();
    const { language } = useLanguage();
    const location = useLocation();
    const notify = useNotify();
    const isMobile = useIsMobile();

    const [showNotifications, setShowNotifications] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showAppleIntro, setShowAppleIntro] = useState(false);
    const [reminderDismissed, setReminderDismissed] = useState(false);
    const [bellShaking, setBellShaking] = useState(false);

    // Dynamic Progress for global load
    const { progress: globalProgress, complete: completeGlobal } = useSimulatedProgress(!profile && !isSkipped, { slowdownPoint: 95 });

    useEffect(() => {
        if (profile || isSkipped) {
            completeGlobal();
        }
    }, [profile, isSkipped, completeGlobal]);

    const isPending = profile?.status === 'pending';

    const { permission, enableNotifications } = useNotifications(user);
    
    // Notification Manager
    const {
        notifications: managedNotifications,
        unreadCount,
        hasNewNotification,
        loading: notifLoading,
        markAsRead,
        markAllAsRead,
        clearNewNotificationFlag
    } = useNotificationManager(user?.id, profile);

    const handleIntroComplete = () => {
        if (profile?.intro_frequency === 'always') {
            sessionStorage.setItem(`session_intro_${user.id}`, 'true');
        } else {
            localStorage.setItem(`last_intro_${user.id}`, new Date().toDateString());
        }
        setShowAppleIntro(false);
    };

    // Unified Background Processing (Theme logic removed, now handled by ThemeContext)
    useEffect(() => {
        if (!user) return;

        // --- Intro Logic: Show for active users OR skipped users (first time only) ---
        if (profile?.daily_intro_enabled !== false || isSkipped) {
            const frequency = profile?.intro_frequency || 'daily';
            
            // Don't show if frequency is set to 'never'
            if (frequency === 'never') return;
            
            const shouldShow = frequency === 'always' 
                ? !sessionStorage.getItem(`session_intro_${user.id}`)
                : localStorage.getItem(`last_intro_${user.id}`) !== new Date().toDateString();
            
            if (shouldShow) {
                // Use setTimeout to avoid setState in effect
                setTimeout(() => setShowAppleIntro(true), 0);
            }
        }
    }, [user, profile, isSkipped]);

    // Unified Background Processing (Theme logic removed, now handled by ThemeContext)

    // Dynamic Progress for Notifications - removed, using simple loader instead
    // const { progress: notifProgress, complete: completeNotifs } = useSimulatedProgress(false, { slowdownPoint: 90 });

    // --- Fast Parallel Fetch for Stats ---
    const { results } = useParallelFetch(
        [
            {
                key: 'stats',
                fetchFn: async () => {
                    if (!user || !profile) return null;
                    let pendingCount = 0;
                    if (profile.role === 'admin') {
                        const pendingProfiles = await getDocuments('profiles', {
                            where: [['status', '==', 'pending']]
                        });
                        pendingCount = pendingProfiles.length;
                    }
                    return { pendingApprovals: pendingCount };
                }
            }
        ],
        {
            enabled: !!user && !!profile
        }
    );

    // Derive state from results
    const statsForNotifs = useMemo(() => results.stats || null, [results.stats]);
    
    // Use managed notifications instead
    const notifications = managedNotifications;

    const showReminder = useMemo(() => {
        if (reminderDismissed) return false;
        
        const isProfileIncomplete = () => {
            if (!profile) return false;
            if (profile.status === 'skipped') return true;
            if (!profile.full_name) return true;

            if (profile.role === 'admin') return false;
            if (profile.role === 'student') return !profile.class_branch;
            if (profile.role === 'teacher') return !profile.class_branch || !profile.college_role;

            return false;
        };

        const shouldShow = isProfileIncomplete();
        
        if (shouldShow) {
            const lastReminded = localStorage.getItem('last_profile_reminder');
            if (!lastReminded) return true;
            
            const lastRemindedTime = parseInt(lastReminded);
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const currentTime = new Date().getTime();

            return (currentTime - lastRemindedTime) > oneWeek;
        }
        
        return false;
    }, [profile, reminderDismissed]);

    const snoozeReminder = () => {
        localStorage.setItem('last_profile_reminder', Date.now().toString());
        setReminderDismissed(true);
    };

    // Handle new notification - shake bell and show toast
    useEffect(() => {
        if (hasNewNotification && notifications.length > 0) {
            const latestNotification = notifications.find(n => !n.isRead);
            
            if (latestNotification) {
                // Use setTimeout to avoid setState in effect
                const timer = setTimeout(() => {
                    setBellShaking(true);
                    notify(`New Circular: ${latestNotification.title}`, 'info');
                    
                    // Stop shaking after 3 seconds
                    setTimeout(() => setBellShaking(false), 3000);
                }, 0);

                return () => clearTimeout(timer);
            }
        }
    }, [hasNewNotification, notifications, notify]);

    // Handle notification click
    const handleNotificationClick = (notificationId) => {
        markAsRead(notificationId);
        setShowNotifications(false);
        clearNewNotificationFlag();
        setBellShaking(false);
    };

    // Handle notification panel open
    const handleNotificationPanelOpen = () => {
        setShowNotifications(!showNotifications);
        if (!showNotifications) {
            clearNewNotificationFlag();
            setBellShaking(false);
        }
    };

    if (isPending) {
        return (
            <div className="flex min-h-screen bg-bg-light font-sans text-text-main">
                <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-bg-light p-12 rounded-[48px] shadow-premium border border-border-light"
                    >
                        <div className="h-24 w-24 bg-primary/5 text-primary rounded-[32px] flex items-center justify-center mx-auto border border-primary/10">
                            <ShieldAlert size={48} />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black tracking-tight">Identity Vetting<span className="text-primary italic">.</span></h2>
                            <p className="text-text-muted font-medium leading-relaxed">
                                Greetings <span className="text-text-main font-bold">{getDisplayName(profile, user)}</span>. Your institutional access request is currently in the verification queue.
                            </p>
                        </div>
                        <div className="bg-surface-light p-6 rounded-2xl border border-border-light/50 space-y-4">
                            <div className="flex items-center justify-center gap-3 text-primary">
                                <Loader2 size={18} className="animate-spin" />
                                <span className="text-xs font-black uppercase tracking-widest">Awaiting Admin Approval</span>
                            </div>
                            <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest">
                                Critical security measures are active. You will be notified once authorized.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 h-12 bg-surface-light hover:bg-outline/10 text-text-main rounded-xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2 border border-border-light/30"
                                >
                                    <RefreshCw size={14} className="opacity-50" />
                                    Check Status
                                </button>
                                <button
                                    onClick={() => {
                                        signOut();
                                        setTimeout(() => { window.location.href = '/' }, 1000);
                                    }}
                                    className="flex-1 h-12 bg-danger/5 hover:bg-danger/10 text-danger rounded-xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2 border border-danger/10"
                                >
                                    <LogOut size={14} />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>
        )
    }

    if (!profile && !isSkipped) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bg-light">
                <ProgressLoader progress={globalProgress} label="Mounting Institutional Node" size="lg" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-bg-light font-sans text-text-main overflow-hidden relative">
            <AnimatePresence>
                {showAppleIntro && (
                    <AppleIntro
                        userName={getDisplayName(profile, user, { firstNameOnly: true })}
                        preferredLanguage={profile?.greeting_language || 'Mixed'}
                        onComplete={handleIntroComplete}
                    />
                )}
            </AnimatePresence>

            <div
                className={`backdrop-blur-overlay ${isSidebarOpen ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Hide sidebar on mobile - mobile has its own nav */}
            {!isMobile && <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}

            <main id="main-content" className={`flex-1 flex flex-col relative min-w-0 bg-bg-light/50 backdrop-blur-sm ${isSidebarOpen ? 'active' : ''}`}>
                <AnimatePresence>
                    {permission === 'default' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-primary text-white overflow-hidden relative shadow-md"
                        >
                            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-bg-light/20 flex items-center justify-center">
                                        <Bell size={14} className="animate-bounce" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-widest leading-none">
                                        Enable <span className="underline decoration-2 underline-offset-4">High Alert</span> Notifications for Urgent Circulars
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={enableNotifications}
                                        className="h-9 px-5 rounded-full bg-bg-light text-primary text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        Allow Now
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mobile header - hidden when using mobile layout */}
                {!isMobile && (
                    <header className="h-14 lg:hidden flex-shrink-0 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 z-40 relative">
                        {/* Tricolor accent at top */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] flex">
                            <div className="flex-1 bg-[#FF9933]" />
                            <div className="flex-1 bg-white" />
                            <div className="flex-1 bg-[#138808]" />
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <label className="hamburger scale-75 hamburger-white">
                                <input
                                    type="checkbox"
                                    checked={isSidebarOpen}
                                    onChange={(e) => setIsSidebarOpen(e.target.checked)}
                                />
                                <svg viewBox="0 0 32 32">
                                    <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                                    <path className="line" d="M7 16 27 16"></path>
                                </svg>
                            </label>
                            <HeaderLogo />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleNotificationPanelOpen}
                                className={`h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-800 text-white relative ${bellShaking ? 'animate-shake' : ''}`}
                            >
                                <Bell size={18} />
                                {(unreadCount > 0 || (profile?.role === 'admin' && statsForNotifs?.pendingApprovals > 0)) && (
                                    <div className="absolute top-2 right-2 h-1.5 w-1.5 bg-red-500 rounded-full border-2 border-slate-900" />
                                )}
                            </button>
                        </div>
                    </header>
                )}

                <header className="h-16 hidden lg:flex flex-shrink-0 bg-bg-light border-b border-border-light items-center justify-between px-8 z-40 relative">
                    {/* Tricolor accent at top */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] flex">
                        <div className="flex-1 bg-[#FF9933]" />
                        <div className="flex-1 bg-white" />
                        <div className="flex-1 bg-[#138808]" />
                    </div>
                    
                    <div className="flex items-center gap-6 flex-1">
                        <label className="hamburger scale-75" aria-label="Toggle sidebar menu">
                            <input
                                type="checkbox"
                                checked={isSidebarOpen}
                                onChange={(e) => setIsSidebarOpen(e.target.checked)}
                                aria-label="Sidebar menu toggle"
                            />
                            <svg viewBox="0 0 32 32" aria-hidden="true">
                                <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
                                <path className="line" d="M7 16 27 16"></path>
                            </svg>
                        </label>
                        <HeaderLogo />
                        <div className="h-6 w-px bg-border-light" />
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                            {getSlogan(language)}
                        </p>
                        <div className="h-6 w-px bg-border-light ml-2" />
                        <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">
                            Developed by <span className="text-primary">SXL Labs</span> <span className="text-text-dim/60">(SuchnaXLink)</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={handleNotificationPanelOpen}
                                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                                aria-expanded={showNotifications}
                                className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors relative ${showNotifications ? 'bg-primary/10 text-primary' : 'hover:bg-surface-light text-text-muted'} ${bellShaking ? 'animate-shake' : ''}`}
                            >
                                <Bell size={20} />
                                {(unreadCount > 0 || (profile?.role === 'admin' && statsForNotifs?.pendingApprovals > 0)) && (
                                    <div className="absolute top-2 right-2 h-2 w-2 bg-danger rounded-full border-2 border-bg-light" />
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowNotifications(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            role="dialog"
                                            aria-label="Notifications panel"
                                            className="absolute right-0 mt-2 w-80 bg-bg-light rounded-3xl shadow-2xl border border-border-light z-50 overflow-hidden"
                                        >
                                            <div className="p-5 border-b border-border-light flex items-center justify-between bg-clip-padding bg-text-main/10 dark:bg-text-main/20">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-text-main">Notifications</h3>
                                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Recent</span>
                                            </div>

                                            <div className="max-h-[400px] overflow-y-auto">
                                                {notifLoading ? (
                                                    <div className="p-10 flex flex-col items-center justify-center gap-3">
                                                        <Loader2 size={24} className="animate-spin text-primary" />
                                                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Refreshing...</p>
                                                    </div>
                                                ) : (
                                                    <div className="py-2">
                                                        {profile?.role === 'admin' && statsForNotifs?.pendingApprovals > 0 && (
                                                            <Link
                                                                to="/dashboard/approvals"
                                                                onClick={() => setShowNotifications(false)}
                                                                className="mx-4 mt-2 mb-4 p-3 bg-primary text-white rounded-2xl flex items-center justify-between group hover:bg-primary-hover transition-all no-underline shadow-sm"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                                                        <ShieldAlert size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[11px] font-black uppercase">Verify Members</p>
                                                                        <p className="text-[10px] opacity-70">{statsForNotifs?.pendingApprovals || 0} pending requests</p>
                                                                    </div>
                                                                </div>
                                                                <ArrowRight size={14} />
                                                            </Link>
                                                        )}

                                                        <div className="px-2 space-y-1">
                                                            {notifLoading ? (
                                                                <div className="py-12 flex flex-col items-center justify-center gap-4">
                                                                    <Loader2 size={24} className="animate-spin text-primary" />
                                                                    <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Loading...</p>
                                                                </div>
                                                            ) : notifications.filter(n => !n.isRead).length === 0 ? (
                                                                !(profile?.role === 'admin' && statsForNotifs?.pendingApprovals > 0) && (
                                                                    <div className="py-12 text-center space-y-2">
                                                                        <div className="h-12 w-12 bg-surface-light rounded-full flex items-center justify-center mx-auto text-text-dim">
                                                                            <Bell size={20} />
                                                                        </div>
                                                                        <p className="text-[11px] font-bold text-text-dim uppercase tracking-widest">No Unread Notifications</p>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                notifications.filter(n => !n.isRead).map((n) => (
                                                                    <Link
                                                                        key={n.id}
                                                                        to={`/dashboard/center/${n.id}`}
                                                                        onClick={() => handleNotificationClick(n.id)}
                                                                        className={`block p-4 rounded-2xl hover:bg-surface-light transition-all border border-transparent hover:border-border-light/30 ${n.priority === 'important' ? 'bg-danger/5' : ''}`}
                                                                    >
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <h4 className="text-xs font-black text-text-main line-clamp-1 flex items-center gap-1.5">
                                                                                {n.priority === 'important' && <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />}
                                                                                {n.title}
                                                                            </h4>
                                                                            <span className="text-[9px] font-bold text-text-dim whitespace-nowrap bg-surface-light px-1.5 py-0.5 rounded-md">
                                                                                {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[10px] text-text-dim font-medium uppercase tracking-tight">
                                                                            {n.author_name} {n.priority === 'important' && <span className="text-danger font-black ml-1 text-[8px] tracking-widest">• HIGH ALERT</span>}
                                                                        </p>
                                                                    </Link>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 bg-bg-light border-t border-border-light flex justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        markAllAsRead();
                                                        notify('All notifications marked as read', 'success');
                                                    }}
                                                    disabled={unreadCount === 0}
                                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Mark All Read
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="h-8 w-px bg-border-light/50 mx-2" />
                        <Link 
                            to="/dashboard/profile" 
                            className="flex items-center gap-3 pl-2 group"
                            aria-label={`Profile: ${getDisplayName(profile, user, { firstNameOnly: true })}`}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-[12px] font-bold text-text-main leading-tight group-hover:text-primary transition-colors">
                                    {getDisplayName(profile, user, { firstNameOnly: true })}
                                </p>
                                <p className="text-[10px] font-medium text-text-dim leading-tight italic uppercase tracking-tighter">{profile?.role}</p>
                            </div>
                            <div className="h-9 w-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-black border border-primary/20 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img 
                                        src={optimizeCloudinaryUrl(profile.avatar_url, { width: 96, height: 96 })} 
                                        alt="Profile" 
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.textContent = (profile?.full_name || user?.email)?.[0] || 'U';
                                        }}
                                    />
                                ) : (
                                    (profile?.full_name || user?.email)?.[0] || 'U'
                                )}
                            </div>
                        </Link>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar">

                    <AnimatePresence>
                        {showReminder && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="glass-panel mx-6 my-4 rounded-xl overflow-hidden"
                            >
                                <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-9 w-9 bg-primary text-white rounded-full flex items-center justify-center shadow-m3-1">
                                            <Info size={18} />
                                        </div>
                                        <div>
                                            <p className="text-text-main text-[13px] font-black tracking-tight">Identity Profile Missing Critical Data</p>
                                            <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Please finalize your setup to ensure seamless departmental communication.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Link
                                            to="/dashboard/profile"
                                            className="btn-primary h-10 px-6 py-0 text-[10px] uppercase tracking-widest shadow-none hover:shadow-m3-1"
                                        >
                                            Complete Now
                                        </Link>
                                        <button
                                            onClick={snoozeReminder}
                                            className="p-2 text-text-dim hover:text-text-main transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className={`w-full ${isMobile ? '' : 'max-w-5xl mx-auto px-6 py-10'}`}>
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                                transition={{ 
                                    duration: 0.25, 
                                    ease: [0.4, 0, 0.2, 1],
                                    opacity: { duration: 0.15 }
                                }}
                                style={{ willChange: 'transform, opacity' }}
                            >
                                <Suspense fallback={
                                    <div className="flex items-center justify-center min-h-[60vh]">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                }>
                                    <Routes location={location}>
                                        <Route index element={isMobile ? <DashboardMobileV2 /> : <CircularCenter />} />
                                        <Route path="center/:id" element={isMobile ? <CircularDetailMobile /> : <CircularDetail />} />
                                        <Route path="create" element={
                                            <RoleGuard allowedRoles={['admin', 'teacher']}>
                                                {isMobile ? <CreateCircularMobile /> : <CreateCircular />}
                                            </RoleGuard>
                                        } />
                                        <Route path="drafts" element={
                                            <RoleGuard allowedRoles={['admin', 'teacher']}>
                                                <Drafts />
                                            </RoleGuard>
                                        } />
                                        <Route path="feedback" element={<Feedback />} />
                                        <Route path="my-posts" element={
                                            <RoleGuard allowedRoles={['admin', 'teacher']}>
                                                <MyPosts />
                                            </RoleGuard>
                                        } />
                                        <Route path="approvals" element={
                                            <RoleGuard allowedRoles={['admin']}>
                                                <Approvals />
                                            </RoleGuard>
                                        } />
                                        <Route path="manage-users" element={
                                            <RoleGuard allowedRoles={['admin']}>
                                                <ManageUsers />
                                            </RoleGuard>
                                        } />
                                        <Route path="add-member" element={
                                            <RoleGuard allowedRoles={['admin']}>
                                                {isMobile ? <AddMemberMobile /> : <AddMember />}
                                            </RoleGuard>
                                        } />
                                        <Route path="search-members" element={
                                            <RoleGuard allowedRoles={['admin']}>
                                                <SearchMembers />
                                            </RoleGuard>
                                        } />
                                        <Route path="profile" element={<ProfilePage />} />
                                        <Route path="audit-logs" element={
                                            <RoleGuard allowedRoles={['admin']}>
                                                {isMobile ? <ActivityCloudMobile /> : <AuditLogs />}
                                            </RoleGuard>
                                        } />
                                        <Route path="diagnostic" element={
                                            <RoleGuard allowedRoles={['admin']}>
                                                <DiagnosticTool />
                                            </RoleGuard>
                                        } />
                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                    </Routes>
                                </Suspense>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
