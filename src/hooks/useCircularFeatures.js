import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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
            await supabase.rpc('mark_circular_read', {
                p_circular_id: circularId,
                p_user_id: userId
            });
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    }, [userId]);

    const markAsUnread = useCallback(async (circularId) => {
        if (!userId) return;
        try {
            const { error: err } = await supabase
                .from('circular_reads')
                .delete()
                .eq('circular_id', circularId)
                .eq('user_id', userId);
            if (err) console.error('Mark as unread error:', err);
        } catch (err) {
            console.error('Mark as unread error:', err);
        }
    }, [userId]);

    const getUnreadCount = useCallback(async () => {
        if (!userId) return 0;
        try {
            const { data, error: err } = await supabase.rpc('get_unread_count', {
                p_user_id: userId
            });
            if (err) throw err;
            return data || 0;
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
            const { error: err } = await supabase.from('circular_reads').upsert(reads);
            if (err) throw err;
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
                const { error: err } = await supabase
                    .from('circular_bookmarks')
                    .delete()
                    .eq('circular_id', circularId)
                    .eq('user_id', userId);
                if (err) throw err;
                notify('Removed from bookmarks', 'success');
            } else {
                const { error: err } = await supabase
                    .from('circular_bookmarks')
                    .insert({ circular_id: circularId, user_id: userId });
                if (err) throw err;
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
            const { data, error: err } = await supabase
                .from('circular_bookmarks')
                .select('circular_id')
                .eq('user_id', userId);
            if (err) throw err;
            return data.map(b => b.circular_id);
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
            const { data, error: err } = await supabase
                .from('circular_comments')
                .insert({
                    circular_id: circularId,
                    user_id: userId,
                    user_name: userName,
                    content: content.trim()
                })
                .select()
                .single();
            if (err) throw err;
            notify('Comment added', 'success');
            return data;
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
            const { error: err } = await supabase
                .from('circular_comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', userId);
            if (err) throw err;
            notify('Comment deleted', 'success');
            return true;
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
            const { data, error: err } = await supabase
                .from('circular_comments')
                .select('*')
                .eq('circular_id', circularId)
                .order('created_at', { ascending: false });
            if (err) throw err;
            return data || [];
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
            const { error: err } = await supabase
                .from('circular_acknowledgments')
                .insert({ circular_id: circularId, user_id: userId });
            if (err) throw err;
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
            const { data, error: err } = await supabase
                .from('circular_acknowledgments')
                .select('user_id, acknowledged_at')
                .eq('circular_id', circularId);
            if (err) throw err;
            return data || [];
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
            const { error: err } = await supabase
                .from('circulars')
                .delete()
                .in('id', circularIds);
            if (err) throw err;
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
            const { error: err } = await supabase
                .from('circulars')
                .update({ 
                    is_archived: archive,
                    archived_at: archive ? new Date().toISOString() : null
                })
                .in('id', circularIds);
            if (err) throw err;
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
