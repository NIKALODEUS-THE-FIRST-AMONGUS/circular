import { useState, useCallback } from 'react';
import { getDocuments, createDocument, updateDocument, deleteDocument } from '../lib/firebase-db';
import { useNotify } from '../components/Toaster';

/**
 * Comprehensive hook for all circular features
 * Handles: read status, bookmarks, comments, acknowledgments, etc.
 */
export const useCircularFeatures = (userId) => {
    const notify = useNotify();
    const [loading, setLoading] = useState(false);

    // ============================================
    // FEATURE 3: Read/Unread Status
    // ============================================
    
    const markAsRead = useCallback(async (circularId) => {
        if (!userId) return;
        try {
            // Check if already marked as read
            const existing = await getDocuments('circular_reads', {
                where: [
                    ['circular_id', '==', circularId],
                    ['user_id', '==', userId]
                ]
            });
            
            if (existing.length === 0) {
                await createDocument('circular_reads', {
                    circular_id: circularId,
                    user_id: userId
                });
            }
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    }, [userId]);

    const markAsUnread = useCallback(async (circularId) => {
        if (!userId) return;
        try {
            const reads = await getDocuments('circular_reads', {
                where: [
                    ['circular_id', '==', circularId],
                    ['user_id', '==', userId]
                ]
            });
            
            await Promise.all(reads.map(read => deleteDocument('circular_reads', read.id)));
        } catch (err) {
            console.error('Mark as unread error:', err);
        }
    }, [userId]);

    const getUnreadCount = useCallback(async () => {
        if (!userId) return 0;
        try {
            const allCirculars = await getDocuments('circulars');
            const readCirculars = await getDocuments('circular_reads', {
                where: [['user_id', '==', userId]]
            });
            
            const readIds = new Set(readCirculars.map(r => r.circular_id));
            return allCirculars.filter(c => !readIds.has(c.id)).length;
        } catch (err) {
            console.error('Get unread count error:', err);
            return 0;
        }
    }, [userId]);

    const markAllAsRead = useCallback(async (circularIds) => {
        if (!userId || !circularIds?.length) return;
        try {
            const reads = circularIds.map(id => ({
                circular_id: id,
                user_id: userId
            }));
            
            await Promise.all(reads.map(read => createDocument('circular_reads', read)));
            notify('All marked as read', 'success');
        } catch (err) {
            console.error('Mark all as read error:', err);
            notify('Failed to mark as read', 'error');
        }
    }, [userId, notify]);

    // ============================================
    // FEATURE 4: Bookmarks/Favorites
    // ============================================
    
    const toggleBookmark = useCallback(async (circularId, isBookmarked) => {
        if (!userId) return;
        setLoading(true);
        try {
            if (isBookmarked) {
                const bookmarks = await getDocuments('circular_bookmarks', {
                    where: [
                        ['circular_id', '==', circularId],
                        ['user_id', '==', userId]
                    ]
                });
                
                await Promise.all(bookmarks.map(b => deleteDocument('circular_bookmarks', b.id)));
                notify('Removed from bookmarks', 'success');
            } else {
                await createDocument('circular_bookmarks', {
                    circular_id: circularId,
                    user_id: userId
                });
                notify('Added to bookmarks', 'success');
            }
            return !isBookmarked;
        } catch (err) {
            console.error('Toggle bookmark error:', err);
            notify('Failed to update bookmark', 'error');
            return isBookmarked;
        } finally {
            setLoading(false);
        }
    }, [userId, notify]);

    const getBookmarks = useCallback(async () => {
        if (!userId) return [];
        try {
            const bookmarks = await getDocuments('circular_bookmarks', {
                where: [['user_id', '==', userId]]
            });
            return bookmarks.map(b => b.circular_id);
        } catch (err) {
            console.error('Get bookmarks error:', err);
            return [];
        }
    }, [userId]);

    // ============================================
    // FEATURE 5: Comments/Feedback
    // ============================================
    
    const addComment = useCallback(async (circularId, content, userName) => {
        if (!userId || !content.trim()) return null;
        setLoading(true);
        try {
            const comment = await createDocument('circular_comments', {
                circular_id: circularId,
                user_id: userId,
                user_name: userName,
                content: content.trim()
            });
            
            notify('Comment added', 'success');
            return comment;
        } catch (err) {
            console.error('Add comment error:', err);
            notify('Failed to add comment', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    }, [userId, notify]);

    const deleteComment = useCallback(async (commentId) => {
        setLoading(true);
        try {
            // Verify ownership before deleting
            const comments = await getDocuments('circular_comments', {
                where: [
                    ['id', '==', commentId],
                    ['user_id', '==', userId]
                ]
            });
            
            if (comments.length > 0) {
                await deleteDocument('circular_comments', commentId);
                notify('Comment deleted', 'success');
                return true;
            } else {
                notify('Cannot delete comment', 'error');
                return false;
            }
        } catch (err) {
            console.error('Delete comment error:', err);
            notify('Failed to delete comment', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, notify]);

    const getComments = useCallback(async (circularId) => {
        try {
            const comments = await getDocuments('circular_comments', {
                where: [['circular_id', '==', circularId]],
                orderBy: ['created_at', 'desc']
            });
            return comments || [];
        } catch (err) {
            console.error('Get comments error:', err);
            return [];
        }
    }, []);

    // ============================================
    // FEATURE 8: Acknowledgment System
    // ============================================
    
    const acknowledgeCircular = useCallback(async (circularId) => {
        if (!userId) return false;
        setLoading(true);
        try {
            await createDocument('circular_acknowledgments', {
                circular_id: circularId,
                user_id: userId
            });
            notify('Acknowledged successfully', 'success');
            return true;
        } catch (err) {
            console.error('Acknowledge error:', err);
            notify('Failed to acknowledge', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    }, [userId, notify]);

    const getAcknowledgments = useCallback(async (circularId) => {
        try {
            const acks = await getDocuments('circular_acknowledgments', {
                where: [['circular_id', '==', circularId]]
            });
            return acks || [];
        } catch (err) {
            console.error('Get acknowledgments error:', err);
            return [];
        }
    }, []);

    // ============================================
    // FEATURE 2: Bulk Operations
    // ============================================
    
    const bulkDelete = useCallback(async (circularIds) => {
        if (!circularIds?.length) return false;
        setLoading(true);
        try {
            await Promise.all(circularIds.map(id => deleteDocument('circulars', id)));
            notify(`${circularIds.length} circular(s) deleted`, 'success');
            return true;
        } catch (err) {
            console.error('Bulk delete error:', err);
            notify('Failed to delete circulars', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    }, [notify]);

    const bulkArchive = useCallback(async (circularIds, archive = true) => {
        if (!circularIds?.length) return false;
        setLoading(true);
        try {
            await Promise.all(
                circularIds.map(id => 
                    updateDocument('circulars', id, {
                        is_archived: archive,
                        archived_at: archive ? new Date().toISOString() : null
                    })
                )
            );
            notify(`${circularIds.length} circular(s) ${archive ? 'archived' : 'unarchived'}`, 'success');
            return true;
        } catch (err) {
            console.error('Bulk archive error:', err);
            notify(`Failed to ${archive ? 'archive' : 'unarchive'} circulars`, 'error');
            return false;
        } finally {
            setLoading(false);
        }
    }, [notify]);

    return {
        loading,
        // Read status
        markAsRead,
        markAsUnread,
        getUnreadCount,
        markAllAsRead,
        // Bookmarks
        toggleBookmark,
        getBookmarks,
        // Comments
        addComment,
        deleteComment,
        getComments,
        // Acknowledgments
        acknowledgeCircular,
        getAcknowledgments,
        // Bulk operations
        bulkDelete,
        bulkArchive
    };
};
