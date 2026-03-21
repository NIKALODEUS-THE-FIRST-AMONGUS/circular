import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { deleteDocument } from '../../lib/firebase-db';
import { useNotify } from '../../components/Toaster';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase-config';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, Trash2,
    Loader2, AlertCircle, FileText
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { useConfirm } from '../../components/ConfirmDialog';
import { CircularCard, CircularSearchBar } from '../../components/CircularMobile';
import { useCircularFilters } from '../../hooks/useCircularFilters';
import { ThemeContext } from '../../context/ThemeContext';
import { useContext } from 'react';

// ─── Theme Tokens ─────────────────────────────────────────────────────────────
const tkDashboard = (dark) => ({
    header: dark 
        ? "bg-gradient-to-br from-[#1c2128] to-[#0d1117] border-white/5 shadow-2xl" 
        : "bg-white border-slate-100 shadow-premium",
    title:  dark ? "text-slate-100" : "text-slate-900",
    textMuted: dark ? "text-slate-500" : "text-slate-500",
    label:  dark ? "text-orange-400/80" : "text-blue-500",
    hr:     dark ? "bg-orange-500/30" : "bg-blue-400",
    accent: dark ? "bg-orange-500/10" : "bg-blue-50",
    
    // Stat boxes
    statBlue: dark ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600",
    statEmerald: dark ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600",
    statAmber: dark ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600",
    
    empty: dark ? "bg-[#1c2128] border-white/5 shadow-xl" : "bg-white border-slate-100 shadow-premium",
});

const DashboardMobileV2 = () => {
    const { profile, user, stats } = useAuth();
    const { theme } = useContext(ThemeContext);
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const T = tkDashboard(dark);
    
    const navigate = useNavigate();
    const notify = useNotify();
    const [unreadCount, setUnreadCount] = useState(0);

    const { confirm } = useConfirm();
    
    const [circulars, setCirculars] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Filters hook
    const { 
        filters, setFilters, showFilters, setShowFilters, 
        reset: resetFilters, applyFilters, activeCount 
    } = useCircularFilters();

    // Dynamic style for shadows
    useEffect(() => {
        let styleEl = document.getElementById('custom-shadows');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'custom-shadows';
            styleEl.textContent = `
                .custom-shadow { box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `;
            document.head.appendChild(styleEl);
        }
    }, []);

    // Real-time listener for circulars
    useEffect(() => {
        if (!profile || profile.status !== 'active') return;
        setLoading(true);

        const circularsQuery = query(
            collection(db, 'circulars'),
            orderBy('created_at', 'desc'),
            limit(50)
        );

        const unsubscribeCirculars = onSnapshot(
            circularsQuery,
            (snapshot) => {
                const circularsData = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    circularsData.push({
                        id: doc.id,
                        ...data,
                        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
                        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at
                    });
                });
                
                const validCirculars = circularsData.filter(c => {
                    if (!c.id || !c.title || !c.created_at) return false;
                    // Hide drafts unless user is author or admin
                    if (c.status === 'draft') {
                        if (!profile || (profile.role !== 'admin' && c.author_id !== user?.uid)) {
                            return false;
                        }
                    }
                    return true;
                });
                setCirculars(validCirculars);
                setLoading(false);
            },
            (_err) => {
                console.error('Error:', _err);
                notify('Failed to load circulars', 'error');
                setLoading(false);
            }
        );

        return () => {
            unsubscribeCirculars();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    const filteredCirculars = useMemo(() => {
        let list = applyFilters(circulars);
        if (searchTerm.trim()) {
            const lowerQuery = searchTerm.toLowerCase();
            list = list.filter(c => 
                c.title?.toLowerCase().includes(lowerQuery) ||
                c.content?.toLowerCase().includes(lowerQuery) ||
                c.author_name?.toLowerCase().includes(lowerQuery)
            );
        }
        return list;
    }, [searchTerm, circulars, applyFilters]);

    // Real-time listener for unread count
    useEffect(() => {
        if (profile?.role !== 'student' && profile?.role !== 'teacher') return;
        
        const calculateUnread = () => {
            if (!user?.uid) return;
            const readList = JSON.parse(localStorage.getItem(`read_notifications_${user.uid}`) || '[]');
            setUnreadCount(circulars.filter(c => !readList.includes(c.id)).length);
        };

        calculateUnread();
        
        window.addEventListener('circularRead', calculateUnread);
        window.addEventListener('storage', calculateUnread);

        return () => {
            window.removeEventListener('circularRead', calculateUnread);
            window.removeEventListener('storage', calculateUnread);
        };
    }, [circulars, profile?.role, user?.uid]);

    const handleDelete = async (circularId, e) => {
        e.stopPropagation();
        
        const ok = await confirm({
            title: 'Delete Circular?',
            message: 'Are you sure you want to permanently delete this circular? This action cannot be undone.',
            type: 'danger',
            confirmText: 'Delete Now',
            cancelText: 'Cancel'
        });
        
        if (!ok) return;
        try {
            await deleteDocument('circulars', circularId);
            notify('Circular deleted', 'success');
        } catch (err) {
            notify('Delete failed: ' + err.message, 'error');
        }
    };




    return (
        <div className="min-h-screen bg-[#fcfbfb] dark:bg-[#0d1117] font-sans flex flex-col">

            <main className="px-4 pt-[88px] space-y-6 pb-32">
                {/* HeaderCard */}
                <section className={`rounded-3xl p-6 relative overflow-hidden transition-all duration-300 border ${T.header}`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-20 pointer-events-none ${dark ? 'bg-orange-500' : 'bg-blue-100'}`}></div>
                    <div className="relative z-10">
                        <div className="mb-4">
                            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase opacity-70">Proudly Made in India · SxL Labs</p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-[2px] rounded-full ${T.hr}`}></div>
                            <span className={`text-[10px] font-black tracking-widest uppercase ${T.label}`}>
                                {profile?.role === 'admin' ? 'Administrative Node' : 'Student Hub'}
                            </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h1 className={`text-3xl font-black tracking-tighter ${T.title}`}>Circular <span className="text-orange-500">CENTER.</span></h1>
                            {/* Indian Flag */}
                            <div className="w-6 h-4 bg-white border border-slate-200 flex flex-col shadow-sm shrink-0 rounded-[1px] overflow-hidden">
                                <div className="h-1/3 bg-[#FF9933]"></div>
                                <div className="h-1/3 bg-white flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full border-[0.5px] border-[#000080] flex items-center justify-center">
                                        <div className="w-0.5 h-0.5 rounded-full bg-[#000080]"></div>
                                    </div>
                                </div>
                                <div className="h-1/3 bg-[#138808]"></div>
                            </div>
                        </div>
                        <p className={`text-sm font-medium mb-6 ${T.textMuted}`}>System metrics and approvals consolidated.</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {profile?.role === 'admin' ? (
                                <>
                                    <div onClick={() => navigate('/dashboard/approvals')} className={`rounded-2xl p-4 text-center cursor-pointer active:scale-95 transition-transform ${T.statBlue}`}>
                                        <span className={`block text-[10px] font-black tracking-widest mb-1 opacity-80`}>WAITLIST</span>
                                        <span className="text-4xl font-black leading-none">{stats.pendingApprovals || 0}</span>
                                    </div>
                                    <div className={`rounded-2xl p-4 text-center ${T.statEmerald}`}>
                                        <span className={`block text-[10px] font-black tracking-widest mb-1 opacity-80`}>TOTAL USERS</span>
                                        <span className="text-4xl font-black leading-none">{stats.totalUsers || 0}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={`rounded-2xl p-4 text-center ${T.statBlue}`}>
                                        <span className={`block text-[10px] font-black tracking-widest mb-1 opacity-80`}>TOTAL</span>
                                        <span className="text-4xl font-black leading-none">{circulars.length}</span>
                                    </div>
                                    <div className={`rounded-2xl p-4 text-center ${T.statAmber}`}>
                                        <span className={`block text-[10px] font-black tracking-widest mb-1 opacity-80`}>UNREAD</span>
                                        <span className="text-4xl font-black leading-none">
                                            {unreadCount}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* ControlsSection */}
                <CircularSearchBar
                    query={searchTerm}
                    onQueryChange={setSearchTerm}
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onFiltersReset={resetFilters}
                    activeFilterCount={activeCount}
                    onClearSearch={() => setSearchTerm('')}
                />

                {/* EmptyState / List */}
                <section className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500 w-8 h-8" /></div>
                    ) : filteredCirculars.length === 0 ? (
                        <div className={`rounded-3xl p-10 text-center border transition-colors ${T.empty}`}>
                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${dark ? 'bg-white/5' : 'bg-slate-50'}`}>
                                <FileText size={24} className={dark ? 'text-slate-600' : 'text-slate-300'} />
                            </div>
                            <h3 className={`text-xl font-black tracking-tight mb-2 ${T.title}`}>No Circulars Found</h3>
                            <p className={`${T.textMuted} font-medium`}>Try checking back later.</p>
                        </div>
                    ) : (
                        filteredCirculars.map(c => (
                            <CircularCard
                                key={c.id}
                                circular={c}
                                onView={(doc) => navigate(`/dashboard/center/${doc.id}`)}
                                onEdit={(profile?.role === 'admin' || c.author_id === user?.uid) ? (doc) => navigate(`/dashboard/center/${doc.id}`, { state: { action: 'edit' } }) : null}
                                onDelete={(profile?.role === 'admin' || c.author_id === user?.uid) ? (doc) => handleDelete(doc.id, { stopPropagation: () => {} }) : null}
                            />
                        ))
                    )}
                </section>
            </main>

            {/* BottomTabBar */}
            <BottomNav notifCount={stats?.pendingApprovals || 0} />
        </div>
    );
};

export default DashboardMobileV2;
