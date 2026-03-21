import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase-config';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';

/**
 * Real-time Notification Manager Hook
 * Synchronizes Navbar badge and global state with role-based Firestore listeners.
 */
export const useNotificationManager = (userId, profile) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0); // Restored to stabilize hook order
    const [hasNewNotification, setHasNewNotification] = useState(false);
    const [loading, setLoading] = useState(true);

    const role = profile?.role || 'student';

    // Helper to determine if a circular passes role filters (identical to NotificationDropdown logic)
    const passesRoleFilterLocal = useCallback((circular, p) => {
        if (!p) return false;
        const { role: r, department, year_of_study, section } = p;
        if (r === "admin") return true;
        if (r === "dept_admin") {
            return circular.department_target === "ALL" || circular.department_target === department || circular.author_role === "admin";
        }
        if (r === "teacher") {
            return circular.author_role === "admin" || circular.author_role === "dept_admin" || circular.department_target === "ALL";
        }
        const deptOk    = circular.department_target === "ALL" || circular.department_target === department;
        const yearOk    = !circular.target_year || circular.target_year === "All" || circular.target_year === year_of_study;
        const sectionOk = !circular.target_section || circular.target_section === "All" || circular.target_section === section;
        return deptOk && yearOk && sectionOk;
    }, []);

    useEffect(() => {
        if (!userId || !profile) return;
        // Sync loading state correctly without synchronous setState warning

        const readKey = `read_notifications_${userId}`;
        const getReadIds = () => JSON.parse(localStorage.getItem(readKey) || "[]");

        // 1. Circulars Listener (Real-time)
        const qC = query(collection(db, "circulars"), where("status", "==", "published"), limit(40));
        const unsubC = onSnapshot(qC, (snap) => {
            const reads = new Set(getReadIds());
            const items = snap.docs
                .map(d => ({ id: d.id, ...d.data(), _type: "circular" }))
                .filter(c => passesRoleFilterLocal(c, profile))
                .map(c => ({ ...c, isRead: reads.has(c.id) }));
            setNotifications(p => {
                const combined = [...items, ...(p.filter(x => x._type === "approval"))];
                return combined.sort((a,b) => {
                    const tA = (a.created_at?.seconds || 0) * 1000 || (a.created_at ? new Date(a.created_at).getTime() : 0);
                    const tB = (b.created_at?.seconds || 0) * 1000 || (b.created_at ? new Date(b.created_at).getTime() : 0);
                    return tB - tA;
                });
            });
            setLoading(false);
        }, (err) => {
            console.error("Realtime Circulars Err:", err);
            setLoading(false);
        });

        // 2. Approvals Listener (Real-time, privileged roles only)
        let unsubA = null;
        if (role !== "student") {
            const qA = query(collection(db, "profiles"), where("status", "==", "pending"), limit(20));
            unsubA = onSnapshot(qA, (snap) => {
                const reads = new Set(getReadIds());
                const items = snap.docs.map(d => ({
                    id: d.id, ...d.data(), _type: "approval",
                    isRead: reads.has(d.id),
                    type: 'approval'
                }));
                setNotifications(p => {
                    const combined = [...(p.filter(x => x._type === "circular")), ...items];
                    return combined.sort((a, b) => {
                        const tA = (a.created_at?.seconds || 0) * 1000 || (a.created_at ? new Date(a.created_at).getTime() : 0);
                        const tB = (b.created_at?.seconds || 0) * 1000 || (b.created_at ? new Date(b.created_at).getTime() : 0);
                        return tB - tA;
                    });
                });
            }, (err) => console.error("Realtime Approvals Err:", err));
        }

        return () => { unsubC(); if(unsubA) unsubA(); };
    }, [userId, profile, role, passesRoleFilterLocal]);

    // Recalculate unread count whenever notifications change
    useEffect(() => {
        const unread = notifications.filter(n => !n.isRead).length;
        // Use timeout to avoid synchronous setState warning in effect
        setTimeout(() => setUnreadCount(unread), 0);
        
        // Vibration/Shake trigger for new items
        if (notifications.length > 0) {
            const latest = notifications[0];
            if (!latest.isRead) {
                const ageSec = (Date.now() - (latest.created_at?.seconds * 1000 || new Date(latest.created_at).getTime())) / 1000;
                if (ageSec < 10) setTimeout(() => setHasNewNotification(true), 0);
            }
        }
    }, [notifications]);

    const markAsRead = useCallback((id) => {
        const key = `read_notifications_${userId}`;
        const ids = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
        ids.add(id);
        localStorage.setItem(key, JSON.stringify([...ids]));
        setNotifications(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
    }, [userId]);

    const markAllAsRead = useCallback(() => {
        const key = `read_notifications_${userId}`;
        localStorage.setItem(key, JSON.stringify(notifications.map(n => n.id)));
        setNotifications(p => p.map(n => ({ ...n, isRead: true })));
    }, [userId, notifications]);

    return {
        notifications,
        unreadCount,
        hasNewNotification,
        loading,
        markAsRead,
        markAllAsRead,
        clearNewNotificationFlag: () => setHasNewNotification(false)
    };
};
