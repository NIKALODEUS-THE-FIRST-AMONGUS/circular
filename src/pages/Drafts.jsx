import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { getDocuments, deleteCircular } from '../lib/firebase-db';
import { useNotify } from '../components/Toaster';
import { useIsMobile } from '../hooks/useIsMobile';
import DraftsMobile from './mobile/DraftsMobile';
import {
    FileText, Trash2, Edit3, Clock, AlertCircle, Loader2, Eye, Sparkles,
    Calendar, Tag, ChevronRight, X
} from 'lucide-react';
import IndianFlagInline from '../components/IndianFlagInline';

const Drafts = () => {
    const { user } = useAuth();
    const notify = useNotify();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    const fetchDrafts = async () => {
        if (!user) return;
        
        setLoading(true);
        try {
            const data = await getDocuments('circulars', {
                where: [
                    ['author_id', '==', user.uid],
                    ['status', '==', 'draft']
                ],
                orderBy: ['created_at', 'desc']
            });

            setDrafts(data || []);
        } catch (err) {
            notify(`❌ Failed to load drafts: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Mobile view
    if (isMobile) {
        return <DraftsMobile />;
    }

    const handleDelete = async (id) => {
        setDeleting(id);
        try {
            await deleteCircular(id);
            
            setDrafts(prev => prev.filter(d => d.id !== id));
            notify('✅ Draft deleted successfully', 'success');
            // Navigate to center with refresh flag to update feed
            navigate('/dashboard/center', { state: { refresh: true } });
        } catch (err) {
            notify(`❌ Delete failed: ${err.message}`, 'error');
        } finally {
            setDeleting(null);
            setShowDeleteConfirm(null);
        }
    };

    const handleEdit = (draft) => {
        // Navigate to create page with draft data
        navigate('/dashboard/create', { state: { draft } });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 lg:px-0 py-8">
                <div className="flex items-center justify-center h-64">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-6xl mx-auto px-4 lg:px-0 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Header with Indian Flag Accent */}
                    <header className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-primary text-[11px] font-black uppercase tracking-[0.2em]">
                                <Sparkles size={13} className="animate-pulse" />
                                Draft Studio
                            </div>
                            <IndianFlagInline />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-text-main tracking-tight">
                                My Drafts<span className="text-primary">.</span>
                            </h1>
                            <p className="text-text-muted text-sm font-medium mt-1">
                                Unfinished circulars saved for later completion.
                            </p>
                        </div>
                    </header>

                    {/* Drafts Count Badge */}
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-xl">
                            <span className="text-xs font-black text-primary uppercase tracking-wider">
                                {drafts.length} {drafts.length === 1 ? 'Draft' : 'Drafts'}
                            </span>
                        </div>
                    </div>

                    {/* Drafts List */}
                    {drafts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-surface-light border border-border-light rounded-3xl p-12 text-center"
                        >
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="h-16 w-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <FileText size={32} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-main mb-2">No Drafts Yet</h3>
                                    <p className="text-sm text-text-muted">
                                        Start composing a circular and save it as a draft to see it here.
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate('/dashboard/create')}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all"
                                >
                                    <Edit3 size={16} />
                                    Create New Circular
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4">
                            <AnimatePresence mode="popLayout">
                                {drafts.map((draft, index) => (
                                    <motion.div
                                        key={draft.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-bg-light border border-border-light rounded-2xl p-6 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Icon */}
                                            <div className="h-12 w-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                                <FileText size={22} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 space-y-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-text-main line-clamp-2 mb-1">
                                                        {draft.title || 'Untitled Draft'}
                                                    </h3>
                                                    <p className="text-sm text-text-muted line-clamp-2">
                                                        {draft.content || 'No content yet...'}
                                                    </p>
                                                </div>

                                                {/* Metadata */}
                                                <div className="flex flex-wrap items-center gap-4 text-xs text-text-dim">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={14} />
                                                        <span className="font-medium">{formatDate(draft.created_at)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Tag size={14} />
                                                        <span className="font-medium">{draft.department_target || 'ALL'}</span>
                                                    </div>
                                                    {draft.priority === 'important' && (
                                                        <div className="flex items-center gap-1.5 text-danger">
                                                            <AlertCircle size={14} />
                                                            <span className="font-bold uppercase tracking-wider">High Priority</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleEdit(draft)}
                                                    className="h-10 px-4 flex items-center gap-2 bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-xl font-bold text-sm transition-all"
                                                    title="Continue Editing"
                                                >
                                                    <Edit3 size={16} />
                                                    <span className="hidden sm:inline">Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(draft.id)}
                                                    disabled={deleting === draft.id}
                                                    className="h-10 w-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-xl transition-all disabled:opacity-50"
                                                    title="Delete Draft"
                                                >
                                                    {deleting === draft.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl"
                        onClick={() => !deleting && setShowDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-surface-light rounded-2xl p-8 max-w-sm w-full shadow-2xl border-2 border-[#FF9933]/20"
                            style={{
                                boxShadow: '0 0 40px rgba(255, 153, 51, 0.3), 0 0 20px rgba(19, 136, 8, 0.2)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="h-14 w-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center border-2 border-red-200 dark:border-red-800">
                                    <AlertCircle className="text-red-600" size={28} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-text-main">Delete Draft?</h3>
                                    <p className="text-sm text-text-muted">
                                        This action cannot be undone. The draft will be permanently removed.
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full pt-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(null)}
                                        disabled={deleting}
                                        className="flex-1 h-11 rounded-xl border-2 border-border-light text-text-muted font-bold text-sm hover:bg-surface-light transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDelete(showDeleteConfirm)}
                                        disabled={deleting}
                                        className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {deleting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            'Delete'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Drafts;
