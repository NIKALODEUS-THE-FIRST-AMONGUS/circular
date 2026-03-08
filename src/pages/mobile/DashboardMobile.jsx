/**
 * Mobile-optimized Dashboard - Circular Center
 * Production-grade SaaS admin dashboard
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDocuments, deleteDocument } from '../../lib/firebase-db';
import { useNotify } from '../../components/Toaster';
import { 
    Menu, Bell, Search, SlidersHorizontal, Trash2, RefreshCw,
    Share2, Edit, Home, FileText, Users, Settings,
    Calendar, Loader2, AlertCircle, Plus, CheckCircle, 
    MessageSquare, LogOut, Moon, Sun, Filter
} from 'lucide-react';
import MobileSidebar from '../../components/MobileSidebar';
import MobileTopBar from '../../components/MobileTopBar';

// Design System
const colors = {
    primary: '#3B82F6',
    secondary: '#64748B',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B'
};

const DashboardMobile = () => {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const notify = useNotify();
    
    const [circulars, setCirculars] = useState([]);
    const [filteredCirculars, setFilteredCirculars] = useState([]);
    const [stats, setStats] = useState({ waitlist: 0, totalUsers: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Fetch data
    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    // Filter circulars based on search
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredCirculars(circulars);
            return;
        }

        const filtered = circulars.filter(circular => 
            circular.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            circular.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            circular.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredCirculars(filtered);
    }, [searchTerm, circulars]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch circulars
            const circularsData = await getDocuments('circulars', {
                orderBy: ['created_at', 'desc'],
                limit: 50
            });
            
            // Filter out ghost circulars
            const validCirculars = circularsData.filter(c => c.id && c.title && c.created_at);
            setCirculars(validCirculars);
            setFilteredCirculars(validCirculars);

            // Fetch stats for admin
            if (profile?.role === 'admin') {
                const [pendingProfiles, allProfiles] = await Promise.all([
                    getDocuments('profiles', { where: [['status', '==', 'pending']] }),
                    getDocuments('profiles')
                ]);
                setStats({
                    waitlist: pendingProfiles.length,
                    totalUsers: allProfiles.length
                });
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message);
            notify('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
        notify('Refreshed', 'success');
    };

    const handleDelete = async (circularId, e) => {
        e.stopPropagation();
        
        if (!window.confirm('Delete this circular?')) return;

        try {
            await deleteDocument('circulars', circularId);
            setCirculars(prev => prev.filter(c => c.id !== circularId));
            notify('Circular deleted', 'success');
        } catch (err) {
            notify('Delete failed: ' + err.message, 'error');
        }
    };

    const getPriorityClasses = (priority) => {
        const p = priority?.toLowerCase();
        if (p === 'important' || p === 'urgent') return 'bg-rose-600';
        if (p === 'event') return 'bg-emerald-600';
        return 'bg-blue-600';
    };

    const getPriorityLabel = (priority) => {
        const p = priority?.toLowerCase();
        if (p === 'important' || p === 'urgent') return 'URGENT';
        if (p === 'event') return 'EVENT';
        return 'STANDARD';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }).toUpperCase();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <MobileSidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                profile={profile} 
                user={user} 
                stats={stats}
            />

            {/* Top Navbar with Hamburger - Common MobileTopBar */}
            <MobileTopBar 
                onMenuClick={() => setIsSidebarOpen(true)}
                profile={profile}
                user={user}
                waitlistCount={stats.waitlist}
            />

            {/* Main Content - Edge to Edge */}
            <main className="pb-20">
                {/* Header Section with Decorative Element */}
                <section className="bg-white rounded-3xl mx-4 mt-4 p-6 custom-shadow relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                    
                    <div className="relative z-10">
                        <div className="mb-4">
                            <p className="text-[10px] font-medium text-slate-400 tracking-wide">
                                Proudly Made in India by SxL Labs
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-px bg-blue-400"></div>
                            <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">
                                {profile?.role === 'admin' ? 'Administrative Node' : 'Student Portal'}
                            </span>
                        </div>
                        
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tighter">
                                Circular <span className="text-blue-600">CENTER.</span>
                            </h1>
                            {/* Indian Flag Icon */}
                            <div className="w-6 h-4 bg-white border border-slate-100 flex flex-col shadow-sm">
                                <div className="h-1/3 bg-[#FF9933]"></div>
                                <div className="h-1/3 bg-white flex items-center justify-center">
                                    <div className="w-1 h-1 rounded-full bg-blue-900"></div>
                                </div>
                                <div className="h-1/3 bg-[#128807]"></div>
                            </div>
                        </div>
                        
                        <p className="text-slate-500 text-sm font-medium mb-6">
                            System metrics and approvals consolidated.
                        </p>

                        {/* Metrics - Admin Only */}
                        {profile?.role === 'admin' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 rounded-2xl p-4 text-center">
                                    <span className="block text-[10px] font-bold text-blue-400 tracking-wider mb-1">
                                        WAITLIST
                                    </span>
                                    <span className="text-4xl font-extrabold text-blue-600 leading-none">
                                        {stats.waitlist}
                                    </span>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                                    <span className="block text-[10px] font-bold text-emerald-400 tracking-wider mb-1">
                                        TOTAL USERS
                                    </span>
                                    <span className="text-4xl font-extrabold text-emerald-600 leading-none">
                                        {stats.totalUsers}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Search & Actions Container */}
                <section className="px-4 mt-6 space-y-3">
                    {/* Search */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search broadcasts, topics..."
                            className="block w-full pl-11 pr-4 py-3.5 bg-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                        />
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex gap-2">
                        <button className="flex-1 bg-white px-4 py-3 rounded-2xl text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 shadow-sm border border-transparent active:scale-95 transition-transform">
                            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                            <span>Advanced Filters</span>
                        </button>
                        {profile?.role === 'admin' && (
                            <button 
                                aria-label="Delete All"
                                className="bg-rose-50 text-rose-600 p-3 rounded-2xl shadow-sm active:scale-95 transition-transform"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button 
                            onClick={handleRefresh}
                            disabled={refreshing}
                            aria-label="Refresh"
                            className="bg-white text-slate-700 p-3 rounded-2xl shadow-sm active:scale-95 transition-transform disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </section>

                {/* Circulars List */}
                <section className="px-4 py-4 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                            <p className="text-sm text-slate-600">Loading circulars...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
                            <p className="text-sm text-slate-600 mb-3">{error}</p>
                            <button 
                                onClick={fetchData}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredCirculars.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <FileText className="w-12 h-12 text-slate-300 mb-2" />
                            <p className="text-sm text-slate-600">
                                {searchTerm ? 'No circulars found' : 'No circulars yet'}
                            </p>
                        </div>
                    ) : (
                        filteredCirculars.map((circular) => {
                            const priorityLabel = getPriorityLabel(circular.priority);
                            
                            return (
                                <div 
                                    key={circular.id}
                                    className="relative flex items-start gap-4"
                                >
                                    <div 
                                        onClick={() => navigate(`/dashboard/center/${circular.id}`)}
                                        className="flex-1 bg-white rounded-3xl p-5 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className={`flex items-center rounded-lg px-3 py-1.5 gap-1.5 ${getPriorityClasses(circular.priority)}`}
                                                >
                                                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
                                                    </svg>
                                                    <span className="text-[10px] font-black text-white tracking-wider">
                                                        {priorityLabel}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50 px-3 py-1.5 rounded-full">
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        TO: <span className="text-slate-600 uppercase">{circular.department_target || 'All'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                                    {formatDate(circular.created_at)}
                                                </span>
                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/>
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="mb-8">
                                            <h3 className="text-4xl font-extrabold text-slate-900 mb-1 leading-tight">
                                                {circular.title}
                                            </h3>
                                            <p className="text-slate-400 font-medium">
                                                {circular.content}
                                            </p>
                                            
                                            {circular.attachments && circular.attachments.length > 0 && (
                                                <div className="mt-4 flex flex-col gap-3">
                                                    {circular.attachments.map((file, idx) => {
                                                        const isImage = file.type?.startsWith('image/') || file.url?.match(/\.(jpeg|jpg|gif|png)$/i);
                                                        if (isImage) {
                                                            return (
                                                                <div key={idx} className="flex flex-col gap-2">
                                                                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                                                                        <img alt="Attachment Preview" className="w-full h-full object-cover" src={file.url} />
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                                                                        </svg>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Image</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        } else {
                                                            return (
                                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                                                                            </svg>
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <p className="text-xs font-bold text-slate-700 truncate">{file.name || 'Document'}</p>
                                                                            <p className="text-[10px] text-slate-400 font-medium uppercase">
                                                                                {file.type?.split('/')[1] || 'FILE'} {(file.size && !isNaN(file.size)) ? `• ${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(file.url, '_blank');
                                                                        }}
                                                                        className="px-4 py-1.5 bg-white border border-slate-200 text-[10px] font-bold text-slate-600 rounded-lg shadow-sm active:scale-95 transition-transform shrink-0 hover:bg-slate-50"
                                                                    >
                                                                        VIEW
                                                                    </button>
                                                                </div>
                                                            );
                                                        }
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Footer */}
                                        <div className="flex justify-end gap-6">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Share logic
                                                }}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Share"
                                            >
                                                <Share2 className="w-5 h-5" />
                                            </button>
                                            {(profile?.role === 'admin' || circular.author_id === user?.uid) && (
                                                <>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/dashboard/center/${circular.id}`);
                                                        }}
                                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDelete(circular.id, e)}
                                                        className="text-slate-400 hover:text-rose-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </section>
            </main>

            {/* Bottom Navigation - Matching HTML Design */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-3 flex items-center justify-around px-2 z-50">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex flex-col items-center gap-1 text-blue-600"
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                
                <button 
                    onClick={() => navigate('/dashboard/drafts')}
                    className="flex flex-col items-center gap-1 text-slate-400"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    </svg>
                    <span className="text-[10px] font-bold">Files</span>
                </button>
                
                {/* Floating FAB - Primary Action */}
                <div className="relative -top-5">
                    <button 
                        onClick={() => navigate('/dashboard/create')}
                        className="flex flex-col items-center justify-center w-14 h-14 bg-blue-600 rounded-full shadow-lg border-4 border-white active:scale-95 transition-transform"
                    >
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/>
                        </svg>
                        <span className="absolute -bottom-6 text-[10px] font-bold text-blue-600 whitespace-nowrap">
                            New
                        </span>
                    </button>
                </div>
                
                <button 
                    onClick={() => navigate('/dashboard/manage-users')}
                    className="flex flex-col items-center gap-1 text-slate-400"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    </svg>
                    <span className="text-[10px] font-bold">Users</span>
                </button>
                
                <button 
                    onClick={() => navigate('/dashboard/profile')}
                    className="flex flex-col items-center gap-1 text-slate-400"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    </svg>
                    <span className="text-[10px] font-bold">Settings</span>
                </button>
            </footer>
        </div>
    );
};

export default DashboardMobile;
