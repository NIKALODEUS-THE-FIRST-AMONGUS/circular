import { useState, useEffect } from 'react';
import { initOneSignal, subscribeToNotifications, getSubscriptionId, tagUser } from '../lib/onesignal-config';
import { useNotify } from '../components/Toaster';
import { createDocument, updateDocument } from '../lib/firebase-db';

export const useNotifications = (user, userRole = 'student', profile = null) => {
    const [permission, setPermission] = useState(Notification.permission);
    const [isInitialized, setIsInitialized] = useState(false);
    const notify = useNotify();

    useEffect(() => {
        if (!user || isInitialized) return;

        // Initialize OneSignal
        const initNotifications = async () => {
            try {
                const success = await initOneSignal(user.uid);
                
                if (success) {
                    setIsInitialized(true);
                    
                    // Get subscription ID and store it
                    const subscriptionId = await getSubscriptionId();
                    if (subscriptionId) {
                        await createDocument('notification_tokens', {
                            user_id: user.uid,
                            subscription_id: subscriptionId,
                            role: userRole,
                            created_at: new Date().toISOString()
                        }).catch(() => {
                            // Try updating if document exists
                            updateDocument('notification_tokens', user.uid, {
                                subscription_id: subscriptionId,
                                role: userRole,
                                updated_at: new Date().toISOString()
                            }).catch(() => {});
                        });

                        // Tag user with role and department for targeted notifications
                        if (profile) {
                            await tagUser({
                                role: userRole,
                                department: profile.department || 'all',
                                user_id: user.uid
                            });
                        }
                    }

                    // Subscribe to notification events
                    subscribeToNotifications((event) => {
                        notify(event.heading || 'New Notification', 'info', {
                            description: event.content || 'You have a new notification'
                        });
                    });

                    setPermission(Notification.permission);
                }
            } catch (error) {
                console.warn('OneSignal initialization failed:', error);
            }
        };

        initNotifications();
    }, [user, userRole, profile, isInitialized, notify]);

    const enableNotifications = async () => {
        try {
            // OneSignal handles permission request internally
            const success = await initOneSignal(user.uid);
            
            if (success) {
                const subscriptionId = await getSubscriptionId();
                
                if (subscriptionId) {
                    await createDocument('notification_tokens', {
                        user_id: user.uid,
                        subscription_id: subscriptionId,
                        role: userRole,
                        created_at: new Date().toISOString()
                    }).catch(() => {
                        updateDocument('notification_tokens', user.uid, {
                            subscription_id: subscriptionId,
                            updated_at: new Date().toISOString()
                        }).catch(() => {});
                    });

                    notify('Push notifications enabled!', 'success');
                    setPermission('granted');
                } else {
                    notify('Notifications enabled, but subscription failed. Please try again.', 'warning');
                }
            } else {
                notify('Failed to enable notifications. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Notification enable error:', error);
            notify('Failed to enable notifications. Please try again.', 'error');
        }
    };

    return { permission, enableNotifications, isInitialized };
};
