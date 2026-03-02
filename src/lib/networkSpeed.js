/**
 * Adaptive timeout utility.
 *
 * Measures a quick RTT ping to Supabase and caches the result.
 * On fast connections  → returns a short timeout (3 000 ms)
 * On medium connections → 8 000 ms
 * On slow / offline    → 20 000 ms
 *
 * The measurement is taken at most once every 60 seconds.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _cachedRtt = null;   // ms  – last measured RTT
let _lastMeasuredAt = 0;       // timestamp

const CACHE_TTL = 60_000; // re-measure after 60 s

/**
 * Detect if on mobile device to use proxy
 */
const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/**
 * Get the correct URL (proxy or direct)
 */
const getHealthCheckUrl = () => {
  if (isMobileDevice()) {
    return `/api/supabase-proxy?path=${encodeURIComponent('/rest/v1/')}`;
  }
  return `${SUPABASE_URL}/rest/v1/`;
};

/**
 * Returns the last measured RTT (ms), or null if never measured.
 */
export function getCachedRtt() { return _cachedRtt; }

/**
 * Pings Supabase and returns the RTT in ms, or Infinity if unreachable.
 * Result is cached for CACHE_TTL ms.
 */
export async function measureRtt() {
    const now = Date.now();
    if (_cachedRtt !== null && now - _lastMeasuredAt < CACHE_TTL) {
        return _cachedRtt;
    }

    if (!SUPABASE_URL) return Infinity;

    const controller = new AbortController();
    const bail = setTimeout(() => controller.abort(), 5000);
    const t0 = performance.now();

    try {
        await fetch(getHealthCheckUrl(), {
            method: 'GET',
            signal: controller.signal,
            headers: { apikey: ANON_KEY },
        });
        const rtt = performance.now() - t0;
        clearTimeout(bail);
        _cachedRtt = rtt;
        _lastMeasuredAt = Date.now();
        return rtt;
    } catch {
        clearTimeout(bail);
        _cachedRtt = Infinity;
        _lastMeasuredAt = Date.now();
        return Infinity;
    }
}

/**
 * Returns an adaptive timeout (ms) based on current network conditions.
 *
 *  RTT < 400 ms  → FAST   → 3 000 ms timeout
 *  RTT < 1500 ms → MEDIUM → 8 000 ms timeout
 *  RTT >= 1500   → SLOW   → 20 000 ms timeout
 *  Offline       → SLOW   → 20 000 ms timeout
 *
 * Pass `freshMeasure: true` to always re-ping (e.g. on first load).
 */
export async function getAdaptiveTimeout({ freshMeasure = false } = {}) {
    if (freshMeasure) {
        _cachedRtt = null;   // invalidate cache
        _lastMeasuredAt = 0;
    }

    const rtt = await measureRtt();

    if (rtt < 500) return 15_000;   // fast (15s for stability)
    if (rtt < 2000) return 30_000;  // medium (30s)
    return 60_000;                   // slow / offline (60s for reliability)
}

/**
 * Convenience: wraps any promise with an adaptive timeout.
 * Triggers a fresh RTT measurement each call by default.
 */
export async function withAdaptiveTimeout(promise, { freshMeasure = false, multiplier = 1 } = {}) {
    const baseMs = await getAdaptiveTimeout({ freshMeasure });
    const ms = baseMs * multiplier;
    const timeoutErr = new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`Network timeout after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeoutErr]);
}
