/* global importScripts, firebase, clients */
// Firebase Messaging Service Worker
// This file must be in the public directory to handle background notifications

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Because Service Workers can wake up when the website is completely closed,
// they need the Firebase Config hardcoded here so they can initialize themselves instantly.
const firebaseConfig = {
    apiKey: "AIzaSyBg2uSfKye-ME8ZBHKs_qvG9gfA_-w-Xas",
    authDomain: "circular2-15417.firebaseapp.com",
    projectId: "circular2-15417",
    storageBucket: "circular2-15417.firebasestorage.app",
    messagingSenderId: "918462031556",
    appId: "1:918462031556:web:88ffdef80c820b25e60b91",
    measurementId: "G-JETZ1K7C1V"
};

// Initialize Firebase immediately when SW wakes up
let firebaseApp;
let messaging;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();

    // Background message handler
    messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.notification?.title || 'New Circular';
        
        // Extract priority from data payload to set visual cues
        const priority = payload.data?.priority || 'standard';
        const isUrgent = priority === 'urgent' || priority === 'high';
        
        const notificationOptions = {
            body: payload.notification?.body || 'A new circular has been posted in your hub.',
            icon: '/logo.svg', // Main icon
            badge: '/logo.svg', // Small status bar icon
            image: isUrgent ? '/urgent-banner.png' : null, // Optional rich image banner
            tag: 'circular-notification',
            requireInteraction: isUrgent, // Keep on screen if urgent
            vibrate: isUrgent ? [200, 100, 200, 100, 500] : [200], // Haptic feedback
            data: {
                url: payload.data?.url || '/dashboard'
            },
            actions: [
                {
                    action: 'open',
                    title: 'View Details'
                }
            ]
        };
        return self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch (err) {
    console.error("Firebase SW init failed:", err);
}

// Handle notification clicks + Action buttons
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Default URL or the one passed in payload
    let urlToOpen = event.notification.data?.url || '/dashboard/center';
    
    // If they clicked the 'open' action button, go straight to the circular
    if (event.action === 'open') {
        urlToOpen = event.notification.data?.url || '/dashboard/center';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if already open to the app
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Otherwise open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Optimize caching strategy
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
