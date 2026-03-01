import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase Configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize messaging only in browser context
let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
        messaging = getMessaging(app);
        
        // Register service worker with timeout
        const timeout = setTimeout(() => {
            // Silently fail after 5 seconds
        }, 5000);
        
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
            .then((registration) => {
                clearTimeout(timeout);
                
                // Send Firebase config to service worker
                if (registration.active) {
                    registration.active.postMessage({
                        type: 'FIREBASE_CONFIG',
                        config: firebaseConfig
                    });
                }
            })
            .catch(() => {
                clearTimeout(timeout);
                // Silently fail - notifications are optional
            });
    } catch {
        // Silently fail - notifications are optional
    }
}

export { messaging };

export const requestForToken = async (userId, supabase) => {
    if (!messaging) {
        return null;
    }

    try {
        // Wait for service worker to be ready with timeout
        if ('serviceWorker' in navigator) {
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Service worker timeout')), 5000)
            );
            await Promise.race([navigator.serviceWorker.ready, timeout]);
        }

        const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });
        
        if (currentToken) {
            // Save to Supabase silently
            try {
                await supabase
                    .from('notification_tokens')
                    .upsert({
                        user_id: userId,
                        token: currentToken,
                        device_type: 'web'
                    }, { 
                        onConflict: 'token',
                        ignoreDuplicates: false 
                    });
            } catch {
                // Ignore save errors - token is still valid
            }
            
            return currentToken;
        }
        
        return null;
    } catch {
        // Silently fail - notifications are optional
        return null;
    }
};

export const onMessageListener = () => {
    if (!messaging) {
        return Promise.reject('Firebase Messaging not initialized');
    }
    
    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
};
