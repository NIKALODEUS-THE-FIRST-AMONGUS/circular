/**
 * Adaptive timeout utility for Firebase.
 * 
 * Firebase SDK handles connection management internally, so we don't need
 * to ping the server. This module now provides sensible default timeouts.
 */

let _cachedRtt = null;
let _lastMeasuredAt = 0;

const CACHE_TTL = 60_000;

/**
 * Returns the last measured RTT (ms), or null if never measured.
 * Note: This is now a no-op for Firebase compatibility.
 */
export function getCachedRtt() { 
    return _cachedRtt; 
}

/**
 * Returns a simulated RTT based on navigator.connection if available.
 * Falls back to a reasonable default.
 */
export async function measureRtt() {
    const now = Date.now();
    if (_cachedRtt !== null && now - _lastMeasuredAt < CACHE_TTL) {
        return _cachedRtt;
    }

    // Use Network Information API if available
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            const effectiveType = connection.effectiveType;
            
            // Estimate RTT based on connection type
            if (effectiveType === '4g') {
                _cachedRtt = 100; // Fast
            } else if (effectiveType === '3g') {
                _cachedRtt = 500; // Medium
            } else if (effectiveType === '2g') {
                _cachedRtt = 2000; // Slow
            } else {
                _cachedRtt = 300; // Default
            }
            
            _lastMeasuredAt = Date.now();
            return _cachedRtt;
        }
    }

    // Default to medium speed
    _cachedRtt = 300;
    _lastMeasuredAt = Date.now();
    return _cachedRtt;
}

/**
 * Returns an adaptive timeout (ms) based on network conditions.
 * 
 * Firebase SDK handles retries internally, so we use generous timeouts.
 */
export async function getAdaptiveTimeout({ freshMeasure = false } = {}) {
    if (freshMeasure) {
        _cachedRtt = null;
        _lastMeasuredAt = 0;
    }

    const rtt = await measureRtt();

    // Firebase is generally fast, use reasonable timeouts
    if (rtt < 500) return 10_000;   // fast (10s)
    if (rtt < 2000) return 20_000;  // medium (20s)
    return 30_000;                   // slow (30s)
}

/**
 * Convenience: wraps any promise with an adaptive timeout.
 */
export async function withAdaptiveTimeout(promise, { freshMeasure = false, multiplier = 1 } = {}) {
    const baseMs = await getAdaptiveTimeout({ freshMeasure });
    const ms = baseMs * multiplier;
    const timeoutErr = new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`Network timeout after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeoutErr]);
}
