import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Notification Manager Hook
 * Handles notification state, read status, and bell shake animation
 */
export const useNotificationManager = (userId, profile) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [hasNewNotification, setHasNewNotification] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!userId || !profile) return;

        setLoading(true);
        try {
            let query = supabase
                .from('circulars')
                .select('id, title, created_at, author_name, priority')
                .order('created_at', { ascending: false });

            if (profile.role === 'student') {
                query = query.in('department_target', ['ALL', profile.department]).limit(20);
            } else {
                query = query.limit(20);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Get read status from localStorage
            const readNotifications = JSON.parse(localStorage.getItem(`read_notifications_${userId}`) || '[]');
            
            // Mark notifications as read/unread
            const notificationsWithStatus = data.map(notif => ({
                ...notif,
                isRead: readNotifications.includes(notif.id)
            }));

            setNotifications(notificationsWithStatus);
            
            // Count unread
            const unread = notificationsWithStatus.filter(n => !n.isRead).length;
            setUnreadCount(unread);

            // Check for new notifications (created in last 5 seconds)
            const now = new Date();
            const hasNew = notificationsWithStatus.some(n => {
                const createdAt = new Date(n.created_at);
                const diffSeconds = (now - createdAt) / 1000;
                return diffSeconds < 5 && !n.isRead;
            });
            
            if (hasNew) {
                setHasNewNotification(true);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [userId, profile]);

    // Mark notification as read
    const markAsRead = useCallback((notificationId) => {
        if (!userId) return;

        const readNotifications = JSON.parse(localStorage.getItem(`read_notifications_${userId}`) || '[]');
        
        if (!readNotifications.includes(notificationId)) {
            readNotifications.push(notificationId);
            localStorage.setItem(`read_notifications_${userId}`, JSON.stringify(readNotifications));
            
            // Update local state
            setNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
            
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    }, [userId]);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        if (!userId) return;

        const allIds = notifications.map(n => n.id);
        localStorage.setItem(`read_notifications_${userId}`, JSON.stringify(allIds));
        
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    }, [userId, notifications]);

    // Clear new notification flag
    const clearNewNotificationFlag = useCallback(() => {
        setHasNewNotification(false);
    }, []);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!userId || !profile) return;

        fetchNotifications();

        // Set up realtime subscription
        const channel = supabase
            .channel('circulars-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'circulars'
                },
                (payload) => {
                    // Check if this circular is relevant to the user
                    const circular = payload.new;
                    const isRelevant = 
                        circular.department_target === 'ALL' ||
                        circular.department_target === profile.department;

                    if (isRelevant) {
                        setHasNewNotification(true);
                        fetchNotifications();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, profile, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        hasNewNotification,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearNewNotificationFlag
    };
};
