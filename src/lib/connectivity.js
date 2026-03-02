// Simple in-memory cache so we don't keep hammering /rest/v1/
let lastCheckAt = 0;
let lastCheckResult = null;

/**
 * Detect if on mobile device to use proxy
 */
const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/**
 * Get the correct URL (proxy or direct)
 */
const getHealthCheckUrl = (supabaseUrl) => {
  if (isMobileDevice()) {
    return `/api/supabase-proxy?path=${encodeURIComponent('/rest/v1/')}`;
  }
  return `${supabaseUrl}/rest/v1/`;
};

/**
 * Utility to check if the Supabase project is reachable.
 * This is used to decide whether to use real Supabase or the mock client.
 *
 * To avoid thousands of health-check requests, the result is cached for
 * a short window (default 60s). Re-mounting providers or components will
 * reuse the last verdict instead of re-pinging immediately.
 */
export const checkSupabaseConnectivity = async (options = {}) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return false;

    const {
        cacheMs = 60_000,   // how long to trust the last check
        timeoutMs = 10_000, // per-request timeout
    } = options;

    const now = Date.now();
    if (lastCheckResult !== null && now - lastCheckAt < cacheMs) {
        return lastCheckResult;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort("timeout");
    }, timeoutMs);

    try {
        const response = await fetch(getHealthCheckUrl(supabaseUrl), {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            }
        });

        clearTimeout(timeoutId);
        lastCheckAt = Date.now();
        lastCheckResult = response.ok || response.status === 401;
        return lastCheckResult;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('🌐 Supabase check timed out after 10s. Your network might be slow or blocking the connection.');
        } else {
            console.error('🌐 Supabase connectivity check failed:', error?.message || error || 'Unknown error');
        }
        clearTimeout(timeoutId);
        lastCheckAt = Date.now();
        lastCheckResult = false;
        return false;
    }
};
