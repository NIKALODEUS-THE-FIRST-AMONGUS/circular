// Unregister Firebase service worker
// Run this once to clean up old Firebase SW registration

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      if (registration.active && registration.active.scriptURL.includes('firebase-messaging-sw.js')) {
        console.log('Unregistering Firebase service worker:', registration.active.scriptURL);
        registration.unregister();
      }
    }
  });
}
