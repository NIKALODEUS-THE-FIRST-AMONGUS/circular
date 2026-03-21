import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize messaging only in browser context
let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
    
    // Register service worker
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        // Send Firebase config to service worker
        if (registration.active) {
          registration.active.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig
          });
        }
      })
      .catch((err) => {
        console.warn('FCM Service Worker registration failed:', err);
      });
  } catch (err) {
    console.warn('FCM Initialization failed:', err);
  }
}

export { messaging };

/**
 * Request FCM token for a user
 * @param {string} _userId - User ID
 * @returns {Promise<string|null>}
 */
export const requestForToken = async (_userId) => {
  if (!messaging) return null;

  try {
    // Wait for service worker to be ready
    if ('serviceWorker' in navigator) {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SW Timeout')), 5000))
      ]);
    }

    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    });
    
    return currentToken || null;
  } catch (err) {
    console.error('FCM Token error:', err);
    return null;
  }
};

/**
 * Listen for foreground messages
 * @returns {Promise<object>}
 */
export const onMessageListener = () => {
  if (!messaging) return Promise.reject('FCM not initialized');
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};

export default app;

