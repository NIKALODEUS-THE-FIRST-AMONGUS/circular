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

const DashboardMobileV2 = () => {
    const { profile, user, stats } = useAuth();
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

            <main className="p-4 space-y-6 pb-32">
                {/* HeaderCard */}
                <section className="bg-white rounded-3xl p-6 custom-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                    <div className="relative z-10">
                        <div className="mb-4">
                            <p className="text-[10px] font-medium text-slate-400 tracking-wide">Proudly Made in India by SxL Labs</p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-px bg-blue-400"></div>
                            <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">
                                {profile?.role === 'admin' ? 'Administrative Node' : 'Student Hub'}
                            </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tighter">Circular <span className="text-blue-600">CENTER.</span></h1>
                            {/* Indian Flag */}
                            <div className="w-6 h-4 bg-white border border-slate-100 flex flex-col shadow-sm shrink-0">
                                <div className="h-1/3 bg-[#FF9933]"></div>
                                <div className="h-1/3 bg-white flex items-center justify-center">
                                    <div className="w-1 h-1 rounded-full bg-blue-900"></div>
                                </div>
                                <div className="h-1/3 bg-[#128807]"></div>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm font-medium mb-6">System metrics and approvals consolidated.</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {profile?.role === 'admin' ? (
                                <>
                                    <div onClick={() => navigate('/dashboard/approvals')} className="bg-blue-50 rounded-2xl p-4 text-center cursor-pointer active:scale-95 transition-transform">
                                        <span className="block text-[10px] font-bold text-blue-400 tracking-wider mb-1">WAITLIST</span>
                                        <span className="text-4xl font-extrabold text-blue-600 leading-none">{stats.pendingApprovals || 0}</span>
                                    </div>
                                    <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                                        <span className="block text-[10px] font-bold text-emerald-400 tracking-wider mb-1">TOTAL USERS</span>
                                        <span className="text-4xl font-extrabold text-emerald-600 leading-none">{stats.totalUsers || 0}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-blue-50 rounded-2xl p-4 text-center">
                                        <span className="block text-[10px] font-bold text-blue-400 tracking-wider mb-1">TOTAL</span>
                                        <span className="text-4xl font-extrabold text-blue-600 leading-none">{circulars.length}</span>
                                    </div>
                                    <div className="bg-amber-50 rounded-2xl p-4 text-center">
                                        <span className="block text-[10px] font-bold text-amber-400 tracking-wider mb-1">UNREAD</span>
                                        <span className="text-4xl font-extrabold text-amber-600 leading-none">
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
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>
                    ) : filteredCirculars.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 custom-shadow text-center">
                            <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                            <h3 className="text-xl font-bold text-slate-700 mb-2">No Circulars Found</h3>
                            <p className="text-slate-500 font-medium">Try checking back later.</p>
                        </div>
                    ) : (
                        filteredCirculars.map(c => (
                            <CircularCard
                                key={c.id}
                                circular={c}
                                onView={(doc) => navigate(`/dashboard/center/${doc.id}`)}
                                onEdit={(profile?.role === 'admin' || c.author_id === user?.uid) ? (doc) => navigate(`/dashboard/center/${doc.id}`) : null}
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
