import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNotify } from '../components/Toaster';
import {
    MessageSquare, Bug, Lightbulb, Sparkles, Send, Loader2,
    ThumbsUp, Eye, EyeOff, AlertTriangle, CheckCircle2,
    Clock, TrendingUp, Shield, Filter, X, MessageCircle, Trash2, AlertCircle
} from 'lucide-react';
import { checkProfanity, getProfanitySeverity, checkExtremeOffensive } from '../utils/profanityFilter';
import IndianFlagInline from '../components/IndianFlagInline';

const Feedback = () => {
    const { user, profile, isAdmin } = useAuth();
    const notify = useNotify();

    // Form state
    const [type, setType] = useState('bug');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('functionality');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Feedback list state
    const [feedbackList, setFeedbackList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Profanity warning
    const [profanityWarning, setProfanityWarning] = useState(null);

    // Comment and status management
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [comment, setComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType, filterStatus]);

    // Check for profanity as user types
    useEffect(() => {
        const checkText = `${title} ${description}`;
        
        // First check for extremely offensive content
        const extremeCheck = checkExtremeOffensive(checkText);
        if (extremeCheck.isExtreme) {
            setProfanityWarning({
                severity: 'extreme',
                message: '🚫 EXTREMELY OFFENSIVE CONTENT DETECTED. This feedback will be automatically rejected. Please remove offensive language.'
            });
            return;
        }
        
        // Then check for regular profanity
        const result = checkProfanity(checkText);
        
        if (result.hasProfanity) {
            const severity = getProfanitySeverity(result.matches);
            setProfanityWarning({
                severity,
                message: severity === 'high' 
                    ? '⚠️ Highly offensive language detected. Please be respectful.'
                    : '⚠️ Inappropriate language detected. Please keep feedback professional.'
            });
        } else {
            setProfanityWarning(null);
        }
    }, [title, description]);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('feedback')
                .select(`
                    *,
                    feedback_votes(count),
                    feedback_comments(
                        id,
                        comment,
                        user_name,
                        is_admin,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });

            if (filterType !== 'all') {
                query = query.eq('type', filterType);
            }

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Process data to hide user info for anonymous feedback
            const processedData = data.map(item => ({
                ...item,
                user_name: item.is_anonymous && !isAdmin ? 'Anonymous' : item.user_name,
                user_email: item.is_anonymous && !isAdmin ? null : item.user_email,
                user_id: item.is_anonymous && !isAdmin ? null : item.user_id
            }));

            setFeedbackList(processedData);
        } catch (err) {
            notify(`❌ Failed to load feedback: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !description.trim()) {
            notify('⚠️ Please fill in all fields', 'error');
            return;
        }

        setSubmitting(true);

        try {
            // Check for extremely offensive content first
            const checkText = `${title} ${description}`;
            const extremeCheck = checkExtremeOffensive(checkText);
            
            if (extremeCheck.isExtreme) {
                notify('🚫 Your feedback contains extremely offensive content and cannot be submitted. This incident has been logged.', 'error');
                setSubmitting(false);
                return;
            }

            // Check for regular profanity
            const profanityResult = checkProfanity(checkText);
            const severity = getProfanitySeverity(profanityResult.matches);

            // Block submission if high severity profanity
            if (severity === 'high') {
                notify('❌ Your feedback contains highly offensive language and cannot be submitted', 'error');
                setSubmitting(false);
                return;
            }

            const feedbackData = {
                user_id: user.id,
                user_name: profile?.full_name || user.email,
                user_email: user.email,
                type,
                title,
                description,
                category,
                is_anonymous: isAnonymous,
                has_profanity: profanityResult.hasProfanity,
                profanity_severity: severity,
                priority: severity === 'medium' ? 'low' : 'medium' // Lower priority if profanity detected
            };

            const { error } = await supabase
                .from('feedback')
                .insert([feedbackData]);

            if (error) throw error;

            notify('✅ Feedback submitted successfully!', 'success');

            // Reset form
            setTitle('');
            setDescription('');
            setType('bug');
            setCategory('functionality');
            setIsAnonymous(false);
            setProfanityWarning(null);

            // Refresh list
            fetchFeedback();
        } catch (err) {
            notify(`❌ Failed to submit feedback: ${err.message}`, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpvote = async (feedbackId) => {
        try {
            // Check if already voted
            const { data: existingVote } = await supabase
                .from('feedback_votes')
                .select('id')
                .eq('feedback_id', feedbackId)
                .eq('user_id', user.id)
                .single();

            if (existingVote) {
                // Remove vote
                await supabase
                    .from('feedback_votes')
                    .delete()
                    .eq('id', existingVote.id);
                notify('👍 Vote removed', 'info');
            } else {
                // Add vote
                await supabase
                    .from('feedback_votes')
                    .insert([{ feedback_id: feedbackId, user_id: user.id }]);
                notify('👍 Upvoted!', 'success');
            }

            fetchFeedback();
        } catch (err) {
            notify(`❌ Failed to vote: ${err.message}`, 'error');
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim()) {
            notify('⚠️ Please enter a comment', 'error');
            return;
        }

        setSubmittingComment(true);
        try {
            const { error } = await supabase
                .from('feedback_comments')
                .insert([{
                    feedback_id: selectedFeedback.id,
                    user_id: user.id,
                    user_name: profile?.full_name || user.email,
                    comment: comment.trim(),
                    is_admin: isAdmin
                }]);

            if (error) throw error;

            notify('✅ Comment added successfully', 'success');
            setComment('');
            setShowCommentModal(false);
            setSelectedFeedback(null);
            fetchFeedback();
        } catch (err) {
            notify(`❌ Failed to add comment: ${err.message}`, 'error');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleStatusChange = async (feedbackId, newStatus) => {
        try {
            const updateData = {
                status: newStatus
            };

            // If marking as resolved, add resolved info
            if (newStatus === 'resolved') {
                updateData.resolved_by = user.id;
                updateData.resolved_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('feedback')
                .update(updateData)
                .eq('id', feedbackId);

            if (error) throw error;

            notify(`✅ Status updated to ${newStatus}`, 'success');
            fetchFeedback();
        } catch (err) {
            notify(`❌ Failed to update status: ${err.message}`, 'error');
        }
    };

    const handleDelete = async (feedbackId) => {
        setDeleting(true);
        try {
            const { error } = await supabase
                .from('feedback')
                .delete()
                .eq('id', feedbackId);

            if (error) throw error;

            notify('✅ Feedback deleted successfully', 'success');
            setShowDeleteConfirm(null);
            fetchFeedback();
        } catch (err) {
            notify(`❌ Failed to delete: ${err.message}`, 'error');
        } finally {
            setDeleting(false);
        }
    };

    const getTypeIcon = (feedbackType) => {
        switch (feedbackType) {
            case 'bug': return <Bug size={18} className="text-red-600" />;
            case 'improvement': return <TrendingUp size={18} className="text-blue-600" />;
            case 'feature': return <Lightbulb size={18} className="text-amber-600" />;
            default: return <MessageSquare size={18} className="text-gray-600" />;
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-50 text-amber-700 border-amber-200',
            reviewing: 'bg-blue-50 text-blue-700 border-blue-200',
            in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
            resolved: 'bg-green-50 text-green-700 border-green-200',
            rejected: 'bg-red-50 text-red-700 border-red-200'
        };

        return (
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.pending}`}>
                {status}
            </span>
        );
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

    return (
        <div className="max-w-7xl mx-auto px-4 lg:px-0 py-8">
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                {/* Header */}
                <header className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-primary text-[11px] font-black uppercase tracking-[0.2em]">
                            <Sparkles size={13} className="animate-pulse" />
                            Feedback Hub
                        </div>
                        <IndianFlagInline />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-text-main tracking-tight">
                            Help Us Improve<span className="text-primary">.</span>
                        </h1>
                        <p className="text-text-muted text-sm font-medium mt-1">
                            Report bugs, suggest improvements, or request new features.
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Submit Feedback Form */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-bg-light border border-border-light rounded-3xl p-6 sticky top-20"
                        >
                            <h2 className="text-lg font-black text-text-main mb-4 flex items-center gap-2">
                                <MessageSquare size={20} className="text-primary" />
                                Submit Feedback
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Type Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setType('bug')}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                                                type === 'bug'
                                                    ? 'bg-primary/10 border-primary text-primary'
                                                    : 'bg-surface-light border-border-light text-text-muted hover:border-primary/30'
                                            }`}
                                        >
                                            <Bug size={18} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Bug</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('improvement')}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                                                type === 'improvement'
                                                    ? 'bg-primary/10 border-primary text-primary'
                                                    : 'bg-surface-light border-border-light text-text-muted hover:border-primary/30'
                                            }`}
                                        >
                                            <TrendingUp size={18} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Improve</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('feature')}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                                                type === 'feature'
                                                    ? 'bg-primary/10 border-primary text-primary'
                                                    : 'bg-surface-light border-border-light text-text-muted hover:border-primary/30'
                                            }`}
                                        >
                                            <Lightbulb size={18} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Feature</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('other')}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                                                type === 'other'
                                                    ? 'bg-primary/10 border-primary text-primary'
                                                    : 'bg-surface-light border-border-light text-text-muted hover:border-primary/30'
                                            }`}
                                        >
                                            <MessageSquare size={18} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Other</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-border-light bg-surface-light text-text-main text-sm font-medium outline-none focus:border-primary transition-all"
                                    >
                                        <option value="ui">User Interface</option>
                                        <option value="performance">Performance</option>
                                        <option value="functionality">Functionality</option>
                                        <option value="security">Security</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Brief summary..."
                                        maxLength={100}
                                        className="w-full h-10 px-3 rounded-xl border border-border-light bg-surface-light text-text-main text-sm font-medium outline-none focus:border-primary transition-all"
                                        required
                                    />
                                    <div className="text-right text-[10px] text-text-dim font-medium">
                                        {title.length}/100
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Provide details..."
                                        rows={5}
                                        maxLength={1000}
                                        className="w-full px-3 py-2 rounded-xl border border-border-light bg-surface-light text-text-main text-sm font-medium outline-none focus:border-primary transition-all resize-none"
                                        required
                                    />
                                    <div className="text-right text-[10px] text-text-dim font-medium">
                                        {description.length}/1000
                                    </div>
                                </div>

                                {/* Profanity Warning */}
                                <AnimatePresence>
                                    {profanityWarning && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className={`p-3 rounded-xl border-2 flex items-start gap-2 ${
                                                profanityWarning.severity === 'extreme'
                                                    ? 'bg-red-100 border-red-300 text-red-900'
                                                    : profanityWarning.severity === 'high'
                                                    ? 'bg-red-50 border-red-200 text-red-700'
                                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                            }`}
                                        >
                                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                            <p className="text-[11px] font-bold">{profanityWarning.message}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Anonymous Toggle */}
                                <div className="flex items-center justify-between p-3 bg-surface-light rounded-xl border border-border-light">
                                    <div className="flex items-center gap-2">
                                        {isAnonymous ? <EyeOff size={16} className="text-text-muted" /> : <Eye size={16} className="text-text-muted" />}
                                        <span className="text-xs font-bold text-text-main">Submit Anonymously</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsAnonymous(!isAnonymous)}
                                        className={`relative w-12 h-6 rounded-full transition-all ${
                                            isAnonymous ? 'bg-primary' : 'bg-gray-300'
                                        }`}
                                    >
                                        <motion.div
                                            animate={{ x: isAnonymous ? 24 : 0 }}
                                            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                </div>

                                {isAnonymous && (
                                    <p className="text-[10px] text-text-dim italic flex items-start gap-1">
                                        <Shield size={12} className="shrink-0 mt-0.5" />
                                        Your identity will be hidden from other users, but admins can see who submitted this feedback.
                                    </p>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting || profanityWarning?.severity === 'high' || profanityWarning?.severity === 'extreme'}
                                    className="w-full h-11 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Submit Feedback
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>

                    {/* Feedback List */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Filter size={16} className="text-text-muted" />
                                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Filters:</span>
                            </div>

                            {/* Type Filter */}
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="h-9 px-3 rounded-lg border border-border-light bg-surface-light text-text-main text-xs font-medium outline-none focus:border-primary transition-all"
                            >
                                <option value="all">All Types</option>
                                <option value="bug">Bugs</option>
                                <option value="improvement">Improvements</option>
                                <option value="feature">Features</option>
                                <option value="other">Other</option>
                            </select>

                            {/* Status Filter */}
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="h-9 px-3 rounded-lg border border-border-light bg-surface-light text-text-main text-xs font-medium outline-none focus:border-primary transition-all"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="reviewing">Reviewing</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                            </select>

                            {filterType !== 'all' || filterStatus !== 'all' ? (
                                <button
                                    onClick={() => {
                                        setFilterType('all');
                                        setFilterStatus('all');
                                    }}
                                    className="h-9 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1"
                                >
                                    <X size={14} />
                                    Clear
                                </button>
                            ) : null}
                        </div>

                        {/* Feedback Items */}
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 size={32} className="animate-spin text-primary" />
                            </div>
                        ) : feedbackList.length === 0 ? (
                            <div className="bg-surface-light border border-border-light rounded-2xl p-12 text-center">
                                <MessageSquare size={48} className="mx-auto text-text-dim mb-4" />
                                <h3 className="text-lg font-bold text-text-main mb-2">No Feedback Yet</h3>
                                <p className="text-sm text-text-muted">
                                    Be the first to submit feedback and help us improve!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {feedbackList.map((item, index) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-bg-light border border-border-light rounded-2xl p-5 hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Upvote Button */}
                                                <button
                                                    onClick={() => handleUpvote(item.id)}
                                                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-surface-light hover:bg-primary/10 hover:text-primary transition-all group"
                                                >
                                                    <ThumbsUp size={18} className="group-hover:scale-110 transition-transform" />
                                                    <span className="text-xs font-bold">{item.upvotes || 0}</span>
                                                </button>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {getTypeIcon(item.type)}
                                                                <h3 className="text-base font-bold text-text-main line-clamp-1">
                                                                    {item.title}
                                                                </h3>
                                                            </div>
                                                            <p className="text-sm text-text-muted line-clamp-2">
                                                                {item.description}
                                                            </p>
                                                        </div>
                                                        {getStatusBadge(item.status)}
                                                    </div>

                                                    {/* Metadata */}
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-dim">
                                                        <div className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            <span>{formatDate(item.created_at)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {item.is_anonymous ? (
                                                                <>
                                                                    <EyeOff size={12} />
                                                                    <span>{item.user_name}</span>
                                                                    {isAdmin && item.user_email && (
                                                                        <span className="text-primary font-bold">({item.user_email})</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Eye size={12} />
                                                                    <span>{item.user_name}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <span className="px-2 py-0.5 bg-surface-light rounded text-[10px] font-bold uppercase">
                                                            {item.category}
                                                        </span>
                                                        {item.has_profanity && isAdmin && (
                                                            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                                                <AlertTriangle size={10} />
                                                                Profanity: {item.profanity_severity}
                                                            </span>
                                                        )}
                                                        {item.feedback_comments && item.feedback_comments.length > 0 && (
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                                                <MessageCircle size={10} />
                                                                {item.feedback_comments.length} {item.feedback_comments.length === 1 ? 'Comment' : 'Comments'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-light">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedFeedback(item);
                                                                setShowCommentModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-1"
                                                        >
                                                            <MessageCircle size={12} />
                                                            Comment
                                                        </button>

                                                        {isAdmin && (
                                                            <>
                                                                {item.status === 'pending' && (
                                                                    <button
                                                                        onClick={() => handleStatusChange(item.id, 'resolved')}
                                                                        className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-all flex items-center gap-1"
                                                                    >
                                                                        <CheckCircle2 size={12} />
                                                                        Mark Resolved
                                                                    </button>
                                                                )}
                                                                {item.status === 'resolved' && (
                                                                    <button
                                                                        onClick={() => handleStatusChange(item.id, 'pending')}
                                                                        className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition-all flex items-center gap-1"
                                                                    >
                                                                        <Clock size={12} />
                                                                        Reopen
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setShowDeleteConfirm(item.id)}
                                                                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1"
                                                                >
                                                                    <Trash2 size={12} />
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Comments List */}
                                                    {item.feedback_comments && item.feedback_comments.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-border-light space-y-2">
                                                            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Comments:</p>
                                                            {item.feedback_comments.map((commentItem) => (
                                                                <div key={commentItem.id} className="p-3 bg-surface-light rounded-xl">
                                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                                        <span className="text-xs font-bold text-text-main">
                                                                            {commentItem.user_name}
                                                                            {commentItem.is_admin && (
                                                                                <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] uppercase">Admin</span>
                                                                            )}
                                                                        </span>
                                                                        <span className="text-[10px] text-text-dim">{formatDate(commentItem.created_at)}</span>
                                                                    </div>
                                                                    <p className="text-xs text-text-muted">{commentItem.comment}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Comment Modal */}
            <AnimatePresence>
                {showCommentModal && selectedFeedback && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl"
                        onClick={() => !submittingComment && setShowCommentModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-surface-light rounded-2xl p-6 max-w-lg w-full shadow-2xl border-2 border-primary/20"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                                    <MessageCircle size={20} className="text-primary" />
                                    Add Comment
                                </h3>
                                <button
                                    onClick={() => setShowCommentModal(false)}
                                    className="p-2 hover:bg-surface-light rounded-lg transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-surface-light rounded-xl">
                                <p className="text-sm font-bold text-text-main mb-1">{selectedFeedback.title}</p>
                                <p className="text-xs text-text-muted line-clamp-2">{selectedFeedback.description}</p>
                            </div>

                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Write your comment..."
                                rows={4}
                                className="w-full px-3 py-2 rounded-xl border border-border-light bg-surface-light text-text-main text-sm outline-none focus:border-primary transition-all resize-none"
                            />

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setShowCommentModal(false)}
                                    disabled={submittingComment}
                                    className="flex-1 h-10 rounded-xl border border-border-light text-text-muted font-bold text-sm hover:bg-surface-light transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddComment}
                                    disabled={submittingComment || !comment.trim()}
                                    className="flex-1 h-10 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submittingComment ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Posting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Post Comment
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            className="bg-white dark:bg-surface-light rounded-2xl p-8 max-w-sm w-full shadow-2xl border-2 border-red-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="h-14 w-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center border-2 border-red-200 dark:border-red-800">
                                    <AlertCircle className="text-red-600" size={28} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-text-main">Delete Feedback?</h3>
                                    <p className="text-sm text-text-muted">
                                        This action cannot be undone. All comments will also be deleted.
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
        </div>
    );
};

export default Feedback;
