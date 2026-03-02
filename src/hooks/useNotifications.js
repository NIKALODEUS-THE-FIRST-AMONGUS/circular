import { useState, useEffect } from 'react';
import { requestForToken, onMessageListener } from '../lib/firebase';
import { useNotify } from '../components/Toaster';
import { createDocument } from '../lib/firebase-db';

export const useNotifications = (user) => {
    const [permission, setPermission] = useState(Notification.permission);
    const notify = useNotify();

    useEffect(() => {
        if (!user) return;

        // If permission is already granted, ensure we have the token
        if (Notification.permission === 'granted') {
            requestForToken(user.uid).then(token => {
                if (token) {
                    // Store token in Firestore
                    createDocument('notification_tokens', {
                        user_id: user.uid,
                        token: token
                    }).catch(() => {});
                }
            }).catch(() => {
                // Silently fail - user can retry manually
            });
        }

        // Listen for foreground messages
        onMessageListener()
            .then((payload) => {
                notify(payload.notification.title, 'info', {
                    description: payload.notification.body
                });
            })
            .catch(() => {
                // Silently fail - messaging not available
            });

    }, [user, notify]);

    const enableNotifications = async () => {
        try {
            const status = await Notification.requestPermission();
            setPermission(status);
            
            if (status === 'granted') {
                const token = await requestForToken(user.uid);
                if (token) {
                    // Store token in Firestore
                    await createDocument('notification_tokens', {
                        user_id: user.uid,
                        token: token
                    });
                    notify('High Alert Notifications enabled!', 'success');
                } else {
                    notify('Notifications enabled, but token generation failed. Please try again.', 'warning');
                }
            } else if (status === 'denied') {
                notify('Notifications blocked. Enable them in browser settings.', 'error');
            } else {
                notify('Notification permission dismissed.', 'info');
            }
        } catch (error) {
            console.error('Permission error:', error);
            notify('Failed to enable notifications. Please try again.', 'error');
        }
    };

    return { permission, enableNotifications };
};
