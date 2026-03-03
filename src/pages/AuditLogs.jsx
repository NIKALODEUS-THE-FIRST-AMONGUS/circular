import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { getDocuments, deleteDocument } from '../lib/firebase-db';
import { useNotify } from '../components/Toaster';
import {
    History, Trash2, RotateCcw, Eye, Search, Filter,
    Calendar, User, FileText, AlertCircle, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { runCleanupTasks } from '../utils/clientCleanup';

/**
 * Audit Logs Page - View all system activity and deleted items
 * Admins and Teachers only
 */
const AuditLogs = () => {
    const { profile } = useAuth();
    const notify = useNotify();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('deleted'); // 'deleted', 'history', 'activity', 'archives'
    const [deletedCirculars, setDeletedCirculars] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [_archives, setArchives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [restoring, setRestoring] = useState(null);

    // Check permissions
    useEffect(() => {
        if (profile && profile.role !== 'admin' && profile.role !== 'teacher') {
            notify('Access denied', 'error');
            navigate('/dashboard');
        }
    }, [profile, navigate, notify]);

    // Run automated cleanup in background (admins only, once per day)
    useEffect(() => {
        if (profile?.role === 'admin') {
            // Run cleanup in background without blocking UI
            runCleanupTasks().then(result => {
                if (result.success && !result.skipped) {
                    console.log('🧹 Automated cleanup completed:', result);
                    // Optionally show a subtle notification
                    if (result.audit_logs?.deleted > 0 || result.deleted_circulars?.deleted > 0) {
                        notify(`Cleanup: ${result.audit_logs?.deleted || 0} logs, ${result.deleted_circulars?.deleted || 0} circulars removed`, 'info');
                    }
                }
            }).catch(err => {
                console.error('Cleanup error:', err);
            });
        }
    }, [profile, notify]);

    // Load data
    useEffect(() => {
        if (!profile) return;
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'deleted') {
                const data = await getDocuments('deleted_circulars', {
                    orderBy: ['deleted_at', 'desc']
                });
                
                setDeletedCirculars(data || []);
            } else if (activeTab === 'activity') {
                const data = await getDocuments('audit_logs', {
                    orderBy: ['created_at', 'desc'],
                    limit: 100
                });
                
                setAuditLogs(data || []);
            } else if (activeTab === 'archives') {
                const data = await getDocuments('audit_log_archives', {
                    orderBy: ['cleanup_date', 'desc'],
                    limit: 50
                });
                
                setArchives(data || []);
            }
        } catch (error) {
            console.error('Load data error:', error);
            notify('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (circularId) => {
        setRestoring(circularId);
        try {
            // Get the deleted circular
            const { getDocument, createDocument } = await import('../lib/firebase-db');
            const deletedCircular = await getDocument('deleted_circulars', circularId);
            
            if (!deletedCircular) {
                throw new Error('Circular not found');
            }
            
            // Remove deletion metadata and restore to circulars
            // eslint-disable-next-line no-unused-vars
            const { deleted_at, deleted_by, ...circularData } = deletedCircular;
            await createDocument('circulars', circularData);
            
            // Remove from deleted_circulars
            await deleteDocument('deleted_circulars', circularId);
            
            notify('Circular restored successfully', 'success');
            loadData();
        } catch (error) {
            console.error('Restore error:', error);
            notify('Failed to restore circular', 'error');
        } finally {
            setRestoring(null);
        }
    };

    const handlePermanentDelete = async (circularId) => {
        if (!window.confirm('Permanently delete this circular? This cannot be undone.')) return;
        
        try {
            await deleteDocument('deleted_circulars', circularId);
            
            notify('Circular permanently deleted', 'success');
            loadData();
        } catch (error) {
            console.error('Permanent delete error:', error);
            notify('Failed to delete circular', 'error');
        }
    };

    const filteredCirculars = deletedCirculars.filter(c =>
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
            <header className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                >
                    <h1 className="text-5xl font-black text-text-main tracking-tight">
                        Activity Cloud<span className="text-primary italic">.</span>
                    </h1>
                    <p className="text-text-muted font-medium">
                        System audit logs and deleted items
                    </p>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {[
                        { id: 'deleted', label: 'Deleted Items', icon: Trash2 },
                        { id: 'activity', label: 'Activity Log', icon: History }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'bg-surface-light text-text-main hover:bg-bg-light'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Search */}
            {activeTab === 'deleted' && (
                <div className="flex items-center gap-3 bg-surface-light px-6 py-3 rounded-xl border border-border-light">
                    <Search size={18} className="text-text-muted" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search deleted circulars..."
                        className="bg-transparent border-none text-sm font-medium text-text-main focus:ring-0 outline-none w-full"
                    />
                </div>
            )}

            {/* Content */}
            <div className="bg-bg-light rounded-3xl border border-border-light shadow-lg overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    </div>
                ) : activeTab === 'deleted' ? (
                    <div className="divide-y divide-border-light">
                        {filteredCirculars.length === 0 ? (
                            <div className="p-20 text-center">
                                <Trash2 size={48} className="mx-auto text-text-muted mb-4" />
                                <p className="text-text-muted font-medium">No deleted circulars</p>
                            </div>
                        ) : (
                            filteredCirculars.map(circular => (
                                <div key={circular.id} className="p-6 hover:bg-surface-light transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <h3 className="font-bold text-text-main">{circular.title}</h3>
                                            <p className="text-sm text-text-muted line-clamp-2">{circular.content}</p>
                                            <div className="flex items-center gap-4 text-xs text-text-dim">
                                                <span className="flex items-center gap-1">
                                                    <User size={12} />
                                                    {circular.author_name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    Deleted {new Date(circular.deleted_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRestore(circular.id)}
                                                disabled={restoring === circular.id}
                                                className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                                title="Restore"
                                            >
                                                <RotateCcw size={18} />
                                            </button>
                                            <button
                                                onClick={() => handlePermanentDelete(circular.id)}
                                                className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all"
                                                title="Permanently delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-border-light">
                        {auditLogs.length === 0 ? (
                            <div className="p-20 text-center">
                                <History size={48} className="mx-auto text-text-muted mb-4" />
                                <p className="text-text-muted font-medium">No activity logs</p>
                            </div>
                        ) : (
                            auditLogs.map(log => (
                                <div key={log.id} className="p-6 hover:bg-surface-light transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            {log.action === 'CREATE' && <CheckCircle size={18} className="text-primary" />}
                                            {log.action === 'UPDATE' && <FileText size={18} className="text-primary" />}
                                            {log.action === 'DELETE' && <Trash2 size={18} className="text-danger" />}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="font-bold text-text-main">{log.action}</p>
                                            <p className="text-sm text-text-muted">{log.details}</p>
                                            <p className="text-xs text-text-dim">
                                                {new Date(log.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
