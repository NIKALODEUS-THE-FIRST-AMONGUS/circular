import { supabase } from './supabase';

/**
 * Keep Supabase database alive to prevent auto-pausing
 * Free tier databases pause after 1 week of inactivity
 * This causes 10-30 second cold starts on first request
 */

let lastPingTime = 0;
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes (reduced frequency)

export const keepDatabaseAlive = async () => {
  const now = Date.now();
  
  // Don't ping too frequently
  if (now - lastPingTime < PING_INTERVAL) {
    return;
  }
  
  try {
    // Simple lightweight query to keep database active
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (!error) {
      lastPingTime = now;
    }
    // Silently fail - this is just a keep-alive ping
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
