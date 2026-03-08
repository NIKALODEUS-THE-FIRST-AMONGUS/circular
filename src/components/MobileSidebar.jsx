import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    X, Target, Edit, FileText, CheckCircle, Users, 
    History, MessageSquare, Settings, Sun, LogOut 
} from 'lucide-react';

const MobileSidebar = ({ isOpen, onClose, profile, user, stats }) => {
    const navigate = useNavigate();

    const TinyIndianFlag = () => (
        <div className="w-5 h-3.5 bg-white border border-slate-100 flex flex-col shadow-sm ml-1 shrink-0 overflow-hidden rounded-[2px]">
            <div className="h-1/3 bg-[#FF9933]"></div>
            <div className="h-1/3 bg-white flex items-center justify-center">
                <div className="w-0.5 h-0.5 rounded-full bg-blue-900"></div>
            </div>
            <div className="h-1/3 bg-[#128807]"></div>
        </div>
    );

    const navTo = (path) => {
        navigate(path);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />
                    <motion.aside 
                        initial={{ x: '-100%' }} 
                        animate={{ x: 0 }} 
                        exit={{ x: '-100%' }}
                        transition={{ type: "spring", damping: 26, stiffness: 280, mass: 1 }}
                        className="fixed top-0 left-0 h-full w-72 bg-[#050b18] text-white z-[70] shadow-2xl flex flex-col"
                    >
                        {/* Header Section */}
                        <div className="px-6 pt-10 pb-6">
                            <div className="flex items-center gap-3 mb-6">
                                <h1 className="text-2xl font-bold tracking-tight flex items-center shrink-0">
                                    <span className="text-white">Suchna</span>
                                    <span className="text-[#ec5b13]">X</span>
                                    <span className="text-[#22c55e] ml-1">Link</span>
                                    <TinyIndianFlag />
                                </h1>
                            </div>

                            {/* System Status Pill */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Live System</span>
                            </div>
                        </div>

                        {/* Navigation Items */}
                        <nav className="flex-1 overflow-y-auto scrollbar-hide">
                            {/* Group: WORKSPACE */}
                            <div className="space-y-0 mb-6">
                                <div className="px-6 py-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#38bdf8]/50">Workspace</p>
                                </div>
                                
                                <button 
                                    onClick={() => navTo('/dashboard')} 
                                    className={`relative w-full h-14 flex items-center gap-4 transition-all duration-200 group ${
                                        window.location.pathname === '/dashboard' ? 'bg-[#0a1122] text-white border-l-2 border-[#ec5b13] pl-5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] pl-6'
                                    }`}
                                >
                                    <div className="flex items-center justify-center w-5">
                                        <Target className={`w-5 h-5 ${window.location.pathname === '/dashboard' ? 'text-[#ec5b13]' : ''}`} />
                                    </div>
                                    <span className="text-[15px] font-bold tracking-wide">Circular Center</span>
                                </button>

                                <button 
                                    onClick={() => navTo('/dashboard/create')} 
                                    className={`relative w-full h-14 flex items-center gap-2 transition-all duration-200 group ${
                                        window.location.pathname === '/dashboard/create' ? 'bg-[#0a1122] text-white border-l-4 border-[#ec5b13] pl-5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] pl-6'
                                    }`}
                                >
                                    <div className="flex items-center justify-center w-5">
                                        <Edit className={`w-5 h-5 ${window.location.pathname === '/dashboard/create' ? 'text-[#ec5b13]' : ''}`} />
                                    </div>
                                    <span className="text-[15px] font-semibold tracking-wide text-slate-400 group-hover:text-white">Compose Post</span>
                                </button>

                                <button 
                                    onClick={() => navTo('/dashboard/drafts')} 
                                    className={`relative w-full h-14 flex items-center gap-2 transition-all duration-200 group ${
                                        window.location.pathname === '/dashboard/drafts' ? 'bg-[#0a1122] text-white border-l-4 border-[#ec5b13] pl-5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] pl-6'
                                    }`}
                                >
                                    <div className="flex items-center justify-center w-5">
                                        <FileText className={`w-5 h-5 ${window.location.pathname === '/dashboard/drafts' ? 'text-[#ec5b13]' : ''}`} />
                                    </div>
                                    <span className="text-[15px] font-semibold tracking-wide text-slate-400 group-hover:text-white">Drafts</span>
                                </button>
                                
                                {(profile?.role === 'admin' || profile?.role === 'teacher') && (
                                    <>
                                        <button 
                                            onClick={() => navTo('/dashboard/approvals')} 
                                            className={`relative w-full h-14 flex items-center justify-between transition-all duration-200 group ${
                                                window.location.pathname === '/dashboard/approvals' ? 'bg-[#0a1122] text-white border-l-4 border-[#ec5b13] pl-5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] pl-6'
                                            } pr-6`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center justify-center w-5">
                                                    <CheckCircle className={`w-5 h-5 ${window.location.pathname === '/dashboard/approvals' ? 'text-[#ec5b13]' : ''}`} />
                                                </div>
                                                <span className="text-[15px] font-semibold tracking-wide text-slate-400 group-hover:text-white">Approvals</span>
                                            </div>
                                            {stats?.waitlist > 0 && (
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ec5b13] text-[10px] font-bold text-white shrink-0">
                                                    {stats.waitlist}
                                                </span>
                                            )}
                                        </button>
                                        <button 
                                            onClick={() => navTo('/dashboard/manage-users')} 
                                            className={`relative w-full h-14 flex items-center gap-2 transition-all duration-200 group ${
                                                window.location.pathname === '/dashboard/manage-users' ? 'bg-[#0a1122] text-white border-l-4 border-[#ec5b13] pl-5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] pl-6'
                                            }`}
                                        >
                                            <div className="flex items-center justify-center w-5">
                                                <Users className={`w-5 h-5 ${window.location.pathname === '/dashboard/manage-users' ? 'text-[#ec5b13]' : ''}`} />
                                            </div>
                                            <span className="text-[15px] font-semibold tracking-wide text-slate-400 group-hover:text-white">Members</span>
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Group: MANAGEMENT */}
                            <div className="space-y-0 pb-10">
                                <div className="px-6 py-4">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#10b981]/50">Management</p>
                                </div>
                                <button 
                                    onClick={() => navTo('/dashboard/audit-logs')} 
                                    className={`relative w-full h-14 flex items-center gap-2 transition-all duration-200 group ${
                                        window.location.pathname === '/dashboard/audit-logs' ? 'bg-[#0a1122] text-white border-l-4 border-[#ec5b13] pl-5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] pl-6'
                                    }`}
                                >
                                    <div className="flex items-center justify-center w-5">
                                        <History className={`w-5 h-5 ${window.location.pathname === '/dashboard/audit-logs' ? 'text-[#ec5b13]' : ''}`} />
                                    </div>
                                    <span className="text-[15px] font-semibold tracking-wide text-slate-400 group-hover:text-white">Logs</span>
                                </button>
                                <button 
                                    onClick={() => navTo('/dashboard/feedback')} 
                                    className={`relative w-full h-14 flex items-center gap-2 transition-all duration-200 group ${
                                        window.location.pathname === '/dashboard/feedback' ? 'bg-[#0a1122] text-white border-l-4 border-[#ec5b13] pl-5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] pl-6'
                                    }`}
                                >
                                    <div className="flex items-center justify-center w-5">
                                        <MessageSquare className={`w-5 h-5 ${window.location.pathname === '/dashboard/feedback' ? 'text-[#ec5b13]' : ''}`} />
                                    </div>
                                    <span className="text-[15px] font-semibold tracking-wide text-slate-400 group-hover:text-white">Feedback</span>
                                </button>
                                <button 
                                    onClick={() => navTo('/dashboard/profile')} 
                                    className={`relative w-full h-14 flex items-center gap-2 transition-all duration-200 group ${
                                        window.location.pathname === '/dashboard/profile' ? 'bg-[#0a1122] text-white border-l-4 border-[#ec5b13] pl-5' : 'text-slate-400 hover:text-white hover:bg-white/[0.02] pl-6'
                                    }`}
                                >
                                    <div className="flex items-center justify-center w-5">
                                        <Settings className={`w-5 h-5 ${window.location.pathname === '/dashboard/profile' ? 'text-[#ec5b13]' : ''}`} />
                                    </div>
                                    <span className="text-[15px] font-semibold tracking-wide text-slate-400 group-hover:text-white">Settings</span>
                                </button>
                            </div>
                        </nav>

                        {/* Footer Section */}
                        <div className="border-t border-white/5 p-6 space-y-6">
                            {/* Theme Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-400 flex items-center gap-3">
                                    <Sun className="w-5 h-5" />
                                    Light Mode
                                </span>
                                <div className="w-11 h-6 bg-slate-700 rounded-full relative flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>

                            {/* User Profile */}
                            <div className="flex items-center gap-4 pt-2">
                                <div className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 overflow-hidden bg-teal-500/20 p-0.5">
                                    {profile?.avatar_url || user?.photoURL ? (
                                        <img src={profile?.avatar_url || user?.photoURL} alt="Avatar" className="h-full w-full object-cover rounded-[14px]" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center font-bold text-teal-400">
                                            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col min-w-0">
                                    <p className="truncate text-base font-bold text-white">{profile?.full_name || 'User'}</p>
                                    <p className="truncate text-[10px] text-slate-500 font-bold uppercase tracking-widest">{profile?.role || 'Institutional Admin'}</p>
                                </div>
                            </div>

                            {/* Sign Out Button */}
                            <button 
                                onClick={async () => {
                                    const { auth } = await import('../lib/firebase-config');
                                    const { signOut } = await import('firebase/auth');
                                    await signOut(auth);
                                    navigate('/');
                                }} 
                                className="w-full py-3.5 bg-[#151c2c] border border-white/5 rounded-xl flex items-center justify-center gap-3 text-slate-300 font-bold active:scale-[0.98] transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Sign Out</span>
                            </button>

                            {/* Credits */}
                            <div className="text-center">
                                <div className="text-[10px] font-medium text-slate-600 flex items-center justify-center gap-2">
                                    Proudly Built for India 
                                    <span className="flex gap-0.5">
                                        <div className="h-1.5 w-3 bg-[#FF9933] rounded-[1px]"></div>
                                        <div className="h-1.5 w-3 bg-white rounded-[1px]"></div>
                                        <div className="h-1.5 w-3 bg-[#138808] rounded-[1px]"></div>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default MobileSidebar;
