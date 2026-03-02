import { createClient } from '@supabase/supabase-js';

/**
 * Detect if user is on mobile device
 */
const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/**
 * Custom fetch function that routes through proxy on mobile
 */
const proxyFetch = (url, options) => {
  // Always use proxy on mobile devices to bypass carrier blocks
  if (!isMobileDevice()) {
    return fetch(url, options);
  }

  // Extract path from Supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!url.startsWith(supabaseUrl)) {
    return fetch(url, options);
  }

  const path = url.replace(supabaseUrl, '');
  const proxyUrl = `/api/supabase-proxy?path=${encodeURIComponent(path)}`;

  console.log('🔄 Mobile detected - routing through proxy:', path);

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
