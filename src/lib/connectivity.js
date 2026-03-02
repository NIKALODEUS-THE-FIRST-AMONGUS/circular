/**
 * Firebase connectivity check.
 * 
 * Note: Firebase SDK handles connectivity internally, so this is mainly
 * for UI feedback purposes. We check using the Network Information API
 * instead of making actual network requests.
 */

let lastCheckAt = 0;
let lastCheckResult = null;

/**
 * Utility to check if the device has network connectivity.
 * Uses the Network Information API instead of pinging Firebase.
 */
export const checkFirebaseConnectivity = async (options = {}) => {
    const {
        cacheMs = 60_000,   // how long to trust the last check
    } = options;

    const now = Date.now();
    if (lastCheckResult !== null && now - lastCheckAt < cacheMs) {
        return lastCheckResult;
    }

    try {
        // Check if online
        if (!navigator.onLine) {
            lastCheckAt = Date.now();
            lastCheckResult = false;
            return false;
        }

        // Use Network Information API if available
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            if (connection && connection.effectiveType) {
                // Consider 'slow-2g' and offline as not connected
                const isConnected = connection.effectiveType !== 'slow-2g';
                lastCheckAt = Date.now();
                lastCheckResult = isConnected;
                return isConnected;
            }
        }

        // Default to online if navigator.onLine is true
        lastCheckAt = Date.now();
        lastCheckResult = true;
        return true;
    } catch (error) {
        console.error('🌐 Connectivity check failed:', error?.message || error || 'Unknown error');
        lastCheckAt = Date.now();
        lastCheckResult = false;
        return false;
    }
};

// Export with old name for backward compatibility
export const checkSupabaseConnectivity = checkFirebaseConnectivity;
