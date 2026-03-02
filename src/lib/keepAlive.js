import { getDocuments } from './firebase-db';

/**
 * Keep Firebase Firestore alive (not needed for Firebase, but kept for compatibility)
 * Firebase doesn't have auto-pausing like Supabase free tier
 * This is now a no-op but kept to avoid breaking existing code
 */

let lastPingTime = 0;
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const keepDatabaseAlive = async () => {
  const now = Date.now();
  
  // Don't ping too frequently
  if (now - lastPingTime < PING_INTERVAL) {
    return;
  }
  
  try {
    // Simple lightweight query to keep database active
    // Firebase doesn't need this, but we'll do it anyway for consistency
    await getDocuments('profiles', { limit: 1 });
    lastPingTime = now;
  } catch {
    // Ignore all errors - this is non-critical
  }
};

/**
 * Start automatic keep-alive pings
 * Call this once when app initializes
 */
export const startKeepAlive = () => {
  // Ping immediately on app start
  keepDatabaseAlive();
  
  // Then ping every 10 minutes while app is open
  const intervalId = setInterval(keepDatabaseAlive, PING_INTERVAL);
  
  // Cleanup on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearInterval(intervalId);
    });
  }
  
  return intervalId;
};

/**
 * Ping database when user becomes active
 * Useful for preventing cold starts after user returns
 */
export const pingOnVisibilityChange = () => {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        keepDatabaseAlive();
      }
    });
  }
};
