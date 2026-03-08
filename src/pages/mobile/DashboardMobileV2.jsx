import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { deleteDocument } from '../../lib/firebase-db';
import { useNotify } from '../../components/Toaster';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase-config';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, Search, Trash2,
    Share2, Edit, Home, FileText, Users, Settings, Plus,
    Loader2, AlertCircle, X,
    CheckCircle, LogOut, MessageSquare, ImageIcon, Sun, Target, History
} from 'lucide-react';
import MobileSidebar from '../../components/MobileSidebar';
import MobileTopBar from '../../components/MobileTopBar';

const DashboardMobileV2 = () => {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const notify = useNotify();
    
    const [circulars, setCirculars] = useState([]);
    const [filteredCirculars, setFilteredCirculars] = useState([]);
    const [stats, setStats] = useState({ 
        waitlist: 0, 
        totalUsers: 0,
        activeCirculars: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        if (!profile) return;
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
                
                const validCirculars = circularsData.filter(c => c.id && c.title && c.created_at);
                setCirculars(validCirculars);
                setLoading(false);
            },
            (err) => {
                console.error('Error:', err);
                setError(err.message);
                notify('Failed to load circulars', 'error');
                setLoading(false);
            }
        );

        let unsubscribePending = null;
        let unsubscribeAll = null;

        if (profile.role === 'admin') {
            const pendingQuery = query(collection(db, 'profiles'), where('status', '==', 'pending'));
            const allProfilesQuery = query(collection(db, 'profiles'));

            unsubscribePending = onSnapshot(pendingQuery, snap => setStats(prev => ({ ...prev, waitlist: snap.size })));
            unsubscribeAll = onSnapshot(allProfilesQuery, snap => setStats(prev => ({ ...prev, totalUsers: snap.size })));
        }

        return () => {
            unsubscribeCirculars();
            if (unsubscribePending) unsubscribePending();
            if (unsubscribeAll) unsubscribeAll();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    useEffect(() => {
        let filtered = circulars;
        if (searchTerm.trim()) {
            const lowerQuery = searchTerm.toLowerCase();
            filtered = filtered.filter(c => 
                c.title?.toLowerCase().includes(lowerQuery) ||
                c.content?.toLowerCase().includes(lowerQuery) ||
                c.author_name?.toLowerCase().includes(lowerQuery)
            );
        }
        setFilteredCirculars(filtered);
    }, [searchTerm, circulars]);

    const handleDelete = async (circularId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this circular?')) return;
        try {
            await deleteDocument('circulars', circularId);
            notify('Circular deleted', 'success');
        } catch (err) {
            notify('Delete failed: ' + err.message, 'error');
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('Delete ALL circulars?')) return;
        if (!window.confirm('Are you ABSOLUTELY sure?')) return;
        setLoading(true);
        try {
            await Promise.all(circulars.map(c => deleteDocument('circulars', c.id)));
            notify('All circulars deleted', 'success');
            setCirculars([]);
            setFilteredCirculars([]);
        } catch (err) {
            notify('Failed to delete all', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    const IndianFlag = () => (
        <div className="w-6 h-4 bg-white border border-slate-100 flex flex-col shadow-sm shrink-0">
            <div className="h-1/3 bg-[#FF9933]"></div>
            <div className="h-1/3 bg-white flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-900"></div>
            </div>
            <div className="h-1/3 bg-[#128807]"></div>
        </div>
    );

    const TinyIndianFlag = () => (
        <div className="w-5 h-3.5 bg-white border border-slate-100 flex flex-col shadow-sm ml-1 shrink-0">
            <div className="h-1/3 bg-[#FF9933]"></div>
            <div className="h-1/3 bg-white flex items-center justify-center">
                <div className="w-0.5 h-0.5 rounded-full bg-blue-900"></div>
            </div>
            <div className="h-1/3 bg-[#128807]"></div>
        </div>
    );

    const getPriorityDetails = (priority) => {
        const p = priority?.toLowerCase();
        if (p === 'important' || p === 'urgent') return { label: 'URGENT', bg: 'bg-rose-600', icon: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z' };
        if (p === 'event') return { label: 'EVENT', bg: 'bg-emerald-600', icon: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z' };
        return { label: 'STANDARD', bg: 'bg-blue-600', icon: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z' };
    };

    return (
        <div className="min-h-[100dvh] bg-[#f8fafc] text-slate-800 font-sans">
            {/* Sidebar Overlay */}
            <MobileSidebar 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
                profile={profile} 
                user={user} 
                stats={stats} 
            />

            {/* NavigationBar */}
            <MobileTopBar 
                onMenuClick={() => setIsMenuOpen(true)}
                profile={profile}
                user={user}
                waitlistCount={stats.waitlist}
            />

            <main className="p-4 space-y-6 max-h-[calc(100vh-64px)] overflow-y-auto hide-scrollbar pb-32">
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
                            <div onClick={() => profile?.role === 'admin' && navigate('/dashboard/approvals')} className="bg-blue-50 rounded-2xl p-4 text-center">
                                <span className="block text-[10px] font-bold text-blue-400 tracking-wider mb-1">WAITLIST</span>
                                <span className="text-4xl font-extrabold text-blue-600 leading-none">{stats.waitlist}</span>
                            </div>
                            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                                <span className="block text-[10px] font-bold text-emerald-400 tracking-wider mb-1">TOTAL USERS</span>
                                <span className="text-4xl font-extrabold text-emerald-600 leading-none">{stats.totalUsers || 0}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ControlsSection */}
                <section className="space-y-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full pl-14 pr-4 py-3.5 bg-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 custom-shadow transition-all" placeholder="Search broadcasts, topics..." type="text"/>
                    </div>
                    
                    <div className="flex gap-2">
                        <button className="flex-1 bg-white px-4 py-3 rounded-2xl text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 custom-shadow border border-transparent active:scale-95 transition-transform">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                            </svg>
                            Advanced Filters
                        </button>
                        {profile?.role === 'admin' && (
                            <button onClick={handleDeleteAll} aria-label="Delete All" className="bg-rose-50 text-rose-600 p-3 rounded-2xl custom-shadow active:scale-95 transition-transform flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        )}
                        <button onClick={() => setSearchTerm('')} aria-label="Refresh" className="bg-white text-slate-700 p-3 rounded-2xl custom-shadow active:scale-95 transition-transform flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                        </button>
                    </div>
                </section>

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
                        filteredCirculars.map(c => {
                            const p = getPriorityDetails(c.priority);
                            return (
                                <div key={c.id} onClick={() => navigate(`/dashboard/center/${c.id}`)} className="relative flex items-start gap-4 cursor-pointer">
                                    <div className="flex-1 bg-white rounded-[24px] p-5 custom-shadow active:scale-[0.98] transition-transform">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className={`flex items-center rounded-lg px-3 py-1.5 gap-1.5 ${p.bg}`}>
                                                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d={p.icon}></path>
                                                    </svg>
                                                    <span className="text-[10px] font-black text-white tracking-wider">{p.label}</span>
                                                </div>
                                                <div className="bg-slate-50 px-3 py-1.5 rounded-full whitespace-nowrap">
                                                    <span className="text-[10px] font-bold text-slate-400">TO: <span className="text-slate-600 uppercase">{c.department_target || 'ALL'}</span></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 shrink-0">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                <span className="text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">{formatDate(c.created_at)}</span>
                                            </div>
                                        </div>

                                        <div className="mb-8">
                                            <h3 className="text-2xl font-extrabold text-slate-900 mb-2 pr-2 leading-tight">{c.title}</h3>
                                            <p className="text-slate-500 font-medium text-sm line-clamp-3">{c.content}</p>
                                            
                                            {c.attachments && c.attachments.length > 0 && (
                                                <div className="mt-4 flex flex-col gap-3">
                                                    {c.attachments.map((file, idx) => {
                                                        const isImage = file.type?.startsWith('image/') || file.url?.match(/\.(jpeg|jpg|gif|png)$/i);
                                                        return isImage ? (
                                                            <div key={idx} className="flex flex-col gap-2">
                                                                <div className="relative w-full h-[140px] rounded-xl overflow-hidden border border-slate-100">
                                                                    <img alt="Attachment" className="w-full h-full object-cover" src={file.url}/>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <ImageIcon size={14} className="text-slate-400" />
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">1 Image Attached</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                                                                        <FileText size={20} />
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <p className="text-xs font-bold text-slate-700 truncate">{file.name || 'document.pdf'}</p>
                                                                        <p className="text-[10px] text-slate-400 font-medium uppercase">{file.type?.split('/')[1] || 'DOC'} • {(file.size / 1024 / 1024).toFixed(1)} MB</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center w-full">
                                            <span className="text-[11px] font-bold text-slate-400">By {c.author_name}</span>
                                            <div className="flex gap-4">
                                                {(profile?.role === 'admin' || c.author_id === user?.uid) && (
                                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/center/${c.id}`); }} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                                {(profile?.role === 'admin' || c.author_id === user?.uid) && (
                                                    <button onClick={(e) => handleDelete(c.id, e)} className="text-slate-400 hover:text-rose-600 transition-colors">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </section>
            </main>

            {/* BottomTabBar */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-3 pb-safe flex items-center justify-around px-2 z-40">
                <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center gap-1 text-blue-600">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                <button onClick={() => navigate('/dashboard/drafts')} className="flex flex-col items-center gap-1 text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                    <span className="text-[10px] font-bold">Files</span>
                </button>
                <div className="relative -top-5">
                    {(profile?.role === 'admin' || profile?.role === 'teacher') ? (
                        <button onClick={() => navigate('/dashboard/create')} className="flex flex-col items-center justify-center w-14 h-14 bg-blue-600 rounded-full shadow-lg border-4 border-white active:scale-95 transition-transform">
                            <Plus size={32} className="text-white" strokeWidth={3} />
                            <span className="absolute -bottom-6 text-[10px] font-bold text-blue-600 whitespace-nowrap">New</span>
                        </button>
                    ) : (
                        <div className="w-14 h-14" />
                    )}
                </div>
                <button onClick={() => profile?.role === 'admin' && navigate('/dashboard/manage-users')} className="flex flex-col items-center gap-1 text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    <span className="text-[10px] font-bold">Users</span>
                </button>
                <button onClick={() => navigate('/dashboard/profile')} className="flex flex-col items-center gap-1 text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span className="text-[10px] font-bold">Settings</span>
                </button>
            </footer>
        </div>
    );
};

export default DashboardMobileV2;
