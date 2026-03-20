/* global importScripts, firebase, clients */
// Firebase Messaging Service Worker
// This file must be in the public directory to handle background notifications

importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-messaging-compat.js');

// Note: Service workers cannot access environment variables directly
// The config is passed from the main app during registration
// This is a limitation of service workers running in a separate context

let firebaseApp = null;
let messaging = null;

// Listen for config from main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FIREBASE_CONFIG') {
        // Only initialize once
        if (!firebaseApp) {
            try {
                firebaseApp = firebase.initializeApp(event.data.config);
                messaging = firebase.messaging();
                
                // Background message handler
                messaging.onBackgroundMessage((payload) => {
                    const notificationTitle = payload.notification?.title || 'New Circular';
                    const notificationOptions = {
                        body: payload.notification?.body || 'A new circular has been posted',
                        icon: '/vite.svg',
                        badge: '/vite.svg',
                        tag: 'circular-notification',
                        requireInteraction: false,
                        data: {
                            url: payload.data?.url || '/dashboard'
                        }
                    };
                    return self.registration.showNotification(notificationTitle, notificationOptions);
                });
            } catch (err) {
                console.error("Firebase SW init failed:", err);
            }
        }
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
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
