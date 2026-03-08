/**
 * Activity Cloud Mobile - Real-time deleted items and audit logs
 * Mobile-optimized design matching the HTML template
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { deleteDocument } from '../../lib/firebase-db';
import { useNotify } from '../../components/Toaster';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase-config';
import { 
    Search, Trash2, RotateCcw, Home, FileText, Users, 
    Settings, Plus, X, Calendar, User, Loader2, Menu
} from 'lucide-react';
import MobileSidebar from '../../components/MobileSidebar';
import MobileTopBar from '../../components/MobileTopBar';

const ActivityCloudMobile = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const notify = useNotify();
    
    const [activeTab, setActiveTab] = useState('deleted');
    const [deletedCirculars, setDeletedCirculars] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Check permissions
    useEffect(() => {
        if (profile && profile.role !== 'admin' && profile.role !== 'teacher') {
            notify('Access denied', 'error');
            navigate('/dashboard');
        }
    }, [profile, navigate, notify]);

    // Real-time listener for deleted circulars
    useEffect(() => {
        if (!profile || activeTab !== 'deleted') return;

        setLoading(true);

        const deletedQuery = query(
            collection(db, 'deleted_circulars'),
            orderBy('deleted_at', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            deletedQuery,
            (snapshot) => {
                const data = [];
                snapshot.forEach((doc) => {
                    const docData = doc.data();
                    data.push({
                        id: doc.id,
                        ...docData,
                        deleted_at: docData.deleted_at?.toDate?.()?.toISOString() || docData.deleted_at,
                        created_at: docData.created_at?.toDate?.()?.toISOString() || docData.created_at
                    });
                });
                setDeletedCirculars(data);
                setLoading(false);
            },
            (err) => {
                console.error('Error in deleted circulars listener:', err);
                notify('Failed to load deleted items', 'error');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile, activeTab, notify]);

    // Real-time listener for audit logs
    useEffect(() => {
        if (!profile || activeTab !== 'activity') return;

        setLoading(true);

        const logsQuery = query(
            collection(db, 'audit_logs'),
            orderBy('created_at', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(
            logsQuery,
            (snapshot) => {
                const data = [];
                snapshot.forEach((doc) => {
                    const docData = doc.data();
                    data.push({
                        id: doc.id,
                        ...docData,
                        created_at: docData.created_at?.toDate?.()?.toISOString() || docData.created_at
                    });
                });
                setAuditLogs(data);
                setLoading(false);
            },
            (err) => {
                console.error('Error in audit logs listener:', err);
                notify('Failed to load activity logs', 'error');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile, activeTab, notify]);

    const handleRestore = async (circularId) => {
        setRestoring(circularId);
        try {
            const circular = deletedCirculars.find(c => c.id === circularId);
            if (!circular) throw new Error('Circular not found');

            // Remove deletion metadata and restore
            // eslint-disable-next-line no-unused-vars
            const { deleted_at, deleted_by, ...circularData } = circular;
            
            // Restore to circulars collection
            await setDoc(doc(db, 'circulars', circularId), {
                ...circularData,
                updated_at: new Date().toISOString()
            });

            // Remove from deleted_circulars
            await deleteDocument('deleted_circulars', circularId);

            notify('Circular restored successfully', 'success');
        } catch (err) {
            console.error('Restore error:', err);
            notify('Failed to restore: ' + err.message, 'error');
        } finally {
            setRestoring(null);
        }
    };

    const handlePermanentDelete = async (circularId) => {
        const confirmed = window.confirm(
            '⚠️ Permanently delete this circular?\n\nThis action CANNOT be undone!'
        );
        if (!confirmed) return;

        try {
            await deleteDocument('deleted_circulars', circularId);
            notify('Permanently deleted', 'success');
        } catch (err) {
            console.error('Delete error:', err);
            notify('Failed to delete: ' + err.message, 'error');
        }
    };

    const filteredCirculars = deletedCirculars.filter(c =>
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f8f6f6] dark:bg-[#221610] flex flex-col font-sans mb-10 pb-10">
            <MobileSidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                profile={profile} 
                user={user} 
            />

            {/* Header - Common MobileTopBar */}
            <MobileTopBar 
                onMenuClick={() => setIsSidebarOpen(true)}
                profile={profile}
                user={user}
            />

            {/* Main Content Area */}
            <main className="flex-1 px-5 pt-8 pb-32 max-w-md mx-auto w-full">
                {/* Title & Subtitle */}
                <div className="mb-8">
                    <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-bold mb-2">Activity Cloud.</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">System audit logs and deleted items</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                    <button
                        onClick={() => setActiveTab('deleted')}
                        className={`flex-1 py-3 text-sm transition-colors ${
                            activeTab === 'deleted'
                                ? 'font-bold border-b-2 border-[#ec5b13] text-slate-900 dark:text-slate-100'
                                : 'font-semibold border-b-2 border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
                        }`}
                    >
                        Deleted Items
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex-1 py-3 text-sm transition-colors ${
                            activeTab === 'activity'
                                ? 'font-bold border-b-2 border-[#ec5b13] text-slate-900 dark:text-slate-100'
                                : 'font-semibold border-b-2 border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
                        }`}
                    >
                        Activity Log
                    </button>
                </div>

                {/* Search Bar */}
                {activeTab === 'deleted' && (
                    <div className="relative mb-12">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ec5b13]/20 focus:border-[#ec5b13] transition-all shadow-sm text-slate-900 dark:text-white"
                            placeholder="Search deleted circulars..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-[#ec5b13] animate-spin mb-4" />
                        <p className="text-slate-500 text-sm">Loading...</p>
                    </div>
                ) : activeTab === 'deleted' ? (
                    filteredCirculars.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-60">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="text-slate-400 w-10 h-10" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No deleted circulars</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredCirculars.map((circular) => (
                                <div 
                                    key={circular.id}
                                    className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm"
                                >
                                    <div className="mb-3">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                                            {circular.title}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                            {circular.content}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                                        <span className="flex items-center gap-1 font-semibold">
                                            <User className="w-3 h-3" />
                                            {circular.author_name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(circular.deleted_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => handleRestore(circular.id)}
                                            disabled={restoring === circular.id}
                                            className="flex-1 h-10 bg-[#ec5b13]/10 text-[#ec5b13] rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#ec5b13] hover:text-white transition-all disabled:opacity-50 inline-flex"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Restore
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(circular.id)}
                                            className="h-10 px-4 bg-red-50 text-red-600 rounded-lg font-semibold text-sm flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    auditLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-60">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <FileText className="text-slate-400 w-10 h-10" />
                            </div>
                            <p className="text-slate-500 font-medium dark:text-slate-400">No activity logs</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {auditLogs.map((log) => (
                                <div 
                                    key={log.id}
                                    className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            log.action === 'DELETE' 
                                                ? 'bg-red-50 text-red-600' 
                                                : 'bg-[#ec5b13]/10 text-[#ec5b13]'
                                        }`}>
                                            {log.action === 'DELETE' ? (
                                                <Trash2 className="w-4 h-4" />
                                            ) : (
                                                <FileText className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                                                {log.action}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 break-words">
                                                {typeof log.details === 'string' 
                                                    ? log.details 
                                                    : JSON.stringify(log.details)
                                                }
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(log.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 px-4 pb-6 pt-2 z-40">
                <div className="max-w-md mx-auto flex items-center justify-between relative">
                    {/* Home */}
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="flex flex-col items-center gap-1 group w-14"
                    >
                        <Home className="w-6 h-6 text-[#ec5b13]" fill="currentColor" />
                        <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">Home</span>
                    </button>

                    {/* Files (Drafts) */}
                    <button 
                        onClick={() => navigate('/dashboard/drafts')}
                        className="flex flex-col items-center gap-1 group w-14"
                    >
                        <FileText className="w-6 h-6 text-slate-400 group-hover:text-[#ec5b13] transition-colors" />
                        <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">Files</span>
                    </button>

                    {/* Prominent FAB Center */}
                    <div className="relative -top-8">
                        <button 
                            onClick={() => navigate('/dashboard/create')}
                            className="w-14 h-14 bg-[#ec5b13] rounded-full shadow-lg shadow-[#ec5b13]/30 flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-950"
                        >
                            <Plus className="w-8 h-8" />
                        </button>
                    </div>

                    {/* Users */}
                    <button 
                        onClick={() => navigate('/dashboard/manage-users')}
                        className="flex flex-col items-center gap-1 group w-14"
                    >
                        <Users className="w-6 h-6 text-slate-400 group-hover:text-[#ec5b13] transition-colors" />
                        <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">Users</span>
                    </button>

                    {/* Settings */}
                    <button 
                        onClick={() => navigate('/dashboard/profile')}
                        className="flex flex-col items-center gap-1 group w-14"
                    >
                        <Settings className="w-6 h-6 text-slate-400 group-hover:text-[#ec5b13] transition-colors" />
                        <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">Settings</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default ActivityCloudMobile;
