// OneSignal Web SDK Configuration
// Uses the native OneSignal SDK loaded via CDN

/**
 * Initialize OneSignal for push notifications
 * @param {string} userId - User ID to tag the subscriber
 * @returns {Promise<boolean>}
 */
export const initOneSignal = async (userId) => {
  // Wait for OneSignal to be loaded
  if (!window.OneSignalDeferred) {
    console.warn('⚠️ OneSignal SDK not loaded');
    return false;
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        // Initialize OneSignal
        await OneSignal.init({
          appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
        });

        // Login user for targeting
        if (userId) {
          await OneSignal.login(userId);
          console.info('✅ OneSignal initialized for user:', userId);
        }

        // Request permission
        const permission = OneSignal.Notifications.permission;
        if (!permission) {
          await OneSignal.Notifications.requestPermission();
        }

        resolve(true);
      } catch (err) {
        console.warn('⚠️ OneSignal initialization failed:', err.message);
        resolve(false);
      }
    });
  });
};

/**
 * Send a notification to specific users
 * @param {Array<string>} userIds - Array of user IDs to notify
 * @param {Object} notification - Notification content
 * @returns {Promise<boolean>}
 */
export const sendNotification = async (userIds, notification) => {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${import.meta.env.VITE_ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: import.meta.env.VITE_ONESIGNAL_APP_ID,
        include_external_user_ids: userIds,
        headings: { en: notification.title },
        contents: { en: notification.body },
        url: notification.url || window.location.origin + '/dashboard',
        data: notification.data || {}
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send notification');
    }

    console.info('✅ Notification sent to', userIds.length, 'users');
    return true;
  } catch (err) {
    console.error('❌ Failed to send notification:', err);
    return false;
  }
};

/**
 * Subscribe to notification events
 * @param {Function} onNotificationReceived - Callback when notification is received
 */
export const subscribeToNotifications = (onNotificationReceived) => {
  if (!window.OneSignalDeferred) return;

  window.OneSignalDeferred.push(function(OneSignal) {
    try {
      OneSignal.Notifications.addEventListener('click', (event) => {
        console.info('📬 Notification clicked:', event);
        if (onNotificationReceived) {
          onNotificationReceived(event);
        }
      });

      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        console.info('📬 Notification received:', event);
        if (onNotificationReceived) {
          onNotificationReceived(event);
        }
      });
    } catch (err) {
      console.warn('⚠️ Failed to subscribe to notifications:', err);
    }
  });
};

/**
 * Get the current subscription ID
 * @returns {Promise<string|null>}
 */
export const getSubscriptionId = async () => {
  if (!window.OneSignalDeferred) return null;

  return new Promise((resolve) => {
    window.OneSignalDeferred.push(async function(OneSignal) {
      try {
        const id = await OneSignal.User.PushSubscription.id;
        resolve(id);
      } catch (err) {
        console.warn('⚠️ Failed to get subscription ID:', err);
        resolve(null);
      }
    });
  });
};

/**
 * Tag a user with custom data
 * @param {Object} tags - Key-value pairs of tags
 */
export const tagUser = async (tags) => {
  if (!window.OneSignalDeferred) return;

  window.OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.User.addTags(tags);
      console.info('✅ User tagged:', tags);
    } catch (err) {
      console.warn('⚠️ Failed to tag user:', err);
    }
  });
};
