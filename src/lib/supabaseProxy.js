import { createClient } from '@supabase/supabase-js';

/**
 * Detect if user is on mobile network that might block Supabase
 */
const isMobileNetwork = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  // Check if on cellular network
  const isCellular = connection?.effectiveType === '4g' || 
                     connection?.effectiveType === '5g' ||
                     connection?.type === 'cellular';
  
  return isMobile && isCellular;
};

/**
 * Custom fetch function that routes through proxy on mobile
 */
const proxyFetch = (url, options) => {
  // Only use proxy on mobile cellular networks
  if (!isMobileNetwork()) {
    return fetch(url, options);
  }

  // Extract path from Supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!url.startsWith(supabaseUrl)) {
    return fetch(url, options);
  }

  const path = url.replace(supabaseUrl, '');
  const proxyUrl = `/api/supabase-proxy?path=${encodeURIComponent(path)}`;

  console.log('🔄 Routing through proxy:', path);

  return fetch(proxyUrl, options);
};

/**
 * Create Supabase client with proxy support
 */
export const createProxiedSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: proxyFetch,
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
};
