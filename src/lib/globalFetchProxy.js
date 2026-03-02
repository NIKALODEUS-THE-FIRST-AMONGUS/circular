/**
 * Global fetch interceptor for blocked networks
 * Intercepts ALL fetch requests to Supabase and routes through proxy
 * Activates on: mobile devices OR when Supabase is unreachable
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// Check if we should use proxy (mobile OR production site)
const shouldUseProxy = () => {
  // Always use proxy on mobile
  if (isMobileDevice()) return true;
  
  // Use proxy on production site (not localhost)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return true;
  }
  
  return false;
};

// Store original fetch
const originalFetch = window.fetch;

// Override global fetch if needed
if (shouldUseProxy() && SUPABASE_URL) {
  window.fetch = function(url, options) {
    // Convert URL to string if it's a Request object
    const urlString = typeof url === 'string' ? url : url.url;
    
    // Check if this is a Supabase request
    if (urlString.startsWith(SUPABASE_URL)) {
      const path = urlString.replace(SUPABASE_URL, '');
      const proxyUrl = `/api/supabase-proxy?path=${encodeURIComponent(path)}`;
      
      console.log('🔄 Intercepted Supabase request:', path);
      
      return originalFetch(proxyUrl, options);
    }
    
    // Not a Supabase request, use original fetch
    return originalFetch(url, options);
  };
  
  console.log('🛡️ Global fetch proxy enabled - all Supabase requests will route through Vercel');
}

export { originalFetch };
