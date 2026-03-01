import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, MessageCircle, CheckCircle, Send, Trash2, X,
    Loader2, Clock, Users
} from 'lucide-react';
import { useCircularFeatures } from '../hooks/useCircularFeatures';
import { useAuth } from '../hooks/useAuth';

/**
 * Comprehensive features component for circular detail page
 * Includes: Bookmarks, Comments, Acknowledgments
 */
const CircularFeatures = ({ circular }) => {
    const { user, profile } = useAuth();
    const features = useCircularFeatures(user?.id);
    
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isAcknowledged, setIsAcknowledged] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [acknowledgments, setAcknowledgments] = useState([]);
    const [showComments, setShowComments] = useState(false);
    const [showAcknowledgments, setShowAcknowledgments] = useState(false);

    // Load initial data
    useEffect(() => {
        if (!circular?.id || !user?.id) return;

        const loadData = async () => {
            // Check bookmark status
            const bookmarks = await features.getBookmarks();
            setIsBookmarked(bookmarks.includes(circular.id));

            // Load comments
            const commentsData = await features.getComments(circular.id);
            setComments(commentsData);

            // Check acknowledgment status
            const acks = await features.getAcknowledgments(circular.id);
            setAcknowledgments(acks);
            setIsAcknowledged(acks.some(a => a.user_id === user.id));
        };

        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [circular?.id, user?.id]);

    const handleToggleBookmark = async () => {
        const newState = await features.toggleBookmark(circular.id, isBookmarked);
        setIsBookmarked(newState);
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const comment = await features.addComment(
            circular.id,
            newComment,
            profile?.full_name || 'Anonymous'
        );

        if (comment) {
            setComments([comment, ...comments]);
            setNewComment('');
        }
    };

    const handleDeleteComment = async (commentId) => {
        const success = await features.deleteComment(commentId);
        if (success) {
            setComments(comments.filter(c => c.id !== commentId));
        }
    };

    const handleAcknowledge = async () => {
        const success = await features.acknowledgeCircular(circular.id);
        if (success) {
            setIsAcknowledged(true);
            setAcknowledgments([...acknowledgments, { user_id: user.id, acknowledged_at: new Date().toISOString() }]);
        }
    };

    const requiresAck = circular?.requires_acknowledgment;
    const ackDeadline = circular?.acknowledgment_deadline;
    const isOverdue = ackDeadline && new Date(ackDeadline) < new Date() && !isAcknowledged;

    return (
        <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                {/* Bookmark Button */}
                <button
                    onClick={handleToggleBookmark}
                    disabled={features.loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        isBookmarked
                            ? 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30'
                            : 'bg-surface-light text-text-muted hover:bg-bg-light'
                    }`}
                >
                    <Star size={16} className={isBookmarked ? 'fill-current' : ''} />
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>

                {/* Comments Button */}
                <button
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-light text-text-muted hover:bg-bg-light font-semibold text-sm transition-all"
                >
                    <MessageCircle size={16} />
                    Comments ({comments.length})
                </button>

                {/* Acknowledgment Button */}
                {requiresAck && (
                    <button
                        onClick={handleAcknowledge}
                        disabled={isAcknowledged || features.loading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            isAcknowledged
                                ? 'bg-green-500/20 text-green-600'
                                : isOverdue
                                ? 'bg-red-500/20 text-red-600 hover:bg-red-500/30'
                                : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                    >
                        {features.loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <CheckCircle size={16} />
                        )}
                        {isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
                    </button>
                )}

                {/* View Acknowledgments (Teachers/Admins) */}
                {(profile?.role === 'teacher' || profile?.role === 'admin') && requiresAck && (
                    <button
                        onClick={() => setShowAcknowledgments(!showAcknowledgments)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-light text-text-muted hover:bg-bg-light font-semibold text-sm transition-all"
                    >
                        <Users size={16} />
                        Acknowledgments ({acknowledgments.length})
                    </button>
                )}
            </div>

            {/* Acknowledgment Deadline Warning */}
            {requiresAck && ackDeadline && !isAcknowledged && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    isOverdue ? 'bg-red-500/10 text-red-600' : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                    <Clock size={16} />
                    <span>
                        {isOverdue ? 'Overdue! ' : 'Deadline: '}
                        {new Date(ackDeadline).toLocaleString()}
                    </span>
                </div>
            )}

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                    >
                        <div className="border-t border-border-light pt-4">
                            <h3 className="text-sm font-semibold text-text-main mb-3">Comments</h3>
                            
                            {/* Add Comment Form */}
                            <form onSubmit={handleAddComment} className="mb-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1 h-10 px-3 rounded-lg border border-border-light bg-bg-light outline-none text-sm focus:border-primary transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || features.loading}
                                        className="px-4 h-10 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {features.loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </div>
                            </form>

                            {/* Comments List */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {comments.length === 0 ? (
                                    <p className="text-sm text-text-muted italic text-center py-4">No comments yet</p>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.id} className="p-3 bg-surface-light rounded-lg">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="text-xs font-semibold text-text-main">{comment.user_name}</p>
                                                    <p className="text-sm text-text-main mt-1">{comment.content}</p>
                                                    <p className="text-xs text-text-muted mt-1">
                                                        {new Date(comment.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                {comment.user_id === user?.id && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all text-text-muted hover:text-red-600"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Acknowledgments Section (Teachers/Admins only) */}
            <AnimatePresence>
                {showAcknowledgments && (profile?.role === 'teacher' || profile?.role === 'admin') && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                    >
                        <div className="border-t border-border-light pt-4">
                            <h3 className="text-sm font-semibold text-text-main mb-3">
                                Acknowledgments ({acknowledgments.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {acknowledgments.length === 0 ? (
                                    <p className="text-sm text-text-muted italic text-center py-4">No acknowledgments yet</p>
                                ) : (
                                    acknowledgments.map((ack, index) => (
                                        <div key={index} className="p-2 bg-surface-light rounded-lg flex items-center justify-between">
                                            <span className="text-sm text-text-main">User ID: {ack.user_id.substring(0, 8)}...</span>
                                            <span className="text-xs text-text-muted">
                                                {new Date(ack.acknowledged_at).toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CircularFeatures;
